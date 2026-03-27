import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, istruzione, imageUrl } = await req.json();

    // Step 1: Groq Vision descrive la foto
    const urlPerVision = imageUrl ?? imageBase64;
    const visionRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: urlPerVision } },
          { type: "text", text: "Describe this photo in English precisely: subjects, background, colors, lighting. Max 30 words." }
        ]
      }],
      max_tokens: 80,
    });
    const descrizione = visionRes.choices[0].message.content ?? "";

    // Step 2: Groq genera prompt SD con la modifica richiesta
    const promptRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Scene: "${descrizione}". Apply this modification: "${istruzione}".
Write an optimized Stable Diffusion prompt in English, max 25 words. Only the prompt, nothing else.`
      }],
      max_tokens: 60,
    });
    const finalPrompt = promptRes.choices[0].message.content?.trim() ?? descrizione;

    // Step 3: Converti base64 in Uint8Array (formato richiesto da CF)
    const base64Data = imageBase64
      ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
      : await fetch(imageUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b).toString("base64"));

    const imageArray = [...new Uint8Array(Buffer.from(base64Data, "base64"))];

    // Step 4: Cloudflare stable-diffusion-v1-5-img2img
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          negative_prompt: "blurry, low quality, distorted, ugly, deformed",
          image: imageArray,
          strength: 0.6,
          num_steps: 20,
          guidance: 7.5,
        }),
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.text();
      throw new Error(`Cloudflare error: ${err}`);
    }

    // Cloudflare restituisce l'immagine come binario
    const arrayBuffer = await cfRes.arrayBuffer();
    const outputBase64 = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    return NextResponse.json({ imageModificata: outputBase64 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore modifica foto" },
      { status: 500 }
    );
  }
}
