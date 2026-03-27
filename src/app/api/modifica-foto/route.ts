import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, istruzione, imageUrl } = await req.json();

    const urlPerVision = imageUrl ?? imageBase64;

    // Step 1: Groq Vision descrive la foto in inglese
    const visionRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: urlPerVision } },
          { type: "text", text: "Describe this photo in English: subjects, background, colors, style. Max 30 words." }
        ]
      }],
      max_tokens: 80,
    });
    const descrizione = visionRes.choices[0].message.content ?? "";

    // Step 2: Groq costruisce il prompt di modifica per FLUX Kontext
    const promptRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `You are a FLUX.1 Kontext prompt expert.
Current image: "${descrizione}"
User wants to modify it: "${istruzione}"

Write a FLUX Kontext editing instruction in English.
Rules: be specific about what to ADD/CHANGE/REMOVE, keep everything else unchanged.
Example format: "Add [X] to [subject]. Keep the background and lighting identical."
Max 30 words. Only the instruction, nothing else.`
      }],
      max_tokens: 80,
    });
    const editPrompt = promptRes.choices[0].message.content?.trim() ?? istruzione;

    // Step 3: Converti immagine in base64 pura (senza prefisso)
    let imageB64: string;
    if (imageBase64) {
      imageB64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    } else {
      const r = await fetch(imageUrl);
      const buf = await r.arrayBuffer();
      imageB64 = Buffer.from(buf).toString("base64");
    }

    // Step 4: Together AI - FLUX.1 Kontext Dev
    const togetherRes = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-kontext-dev",
        prompt: editPrompt,
        image_base64: imageB64,
        width: 800,
        height: 600,
        steps: 28,
        n: 1,
      }),
    });

    if (!togetherRes.ok) {
      const err = await togetherRes.text();
      console.error("Together error:", err);
      throw new Error(`Together AI error: ${err}`);
    }

    const data = await togetherRes.json();

    // Together restituisce URL o base64
    const result = data.data?.[0];
    let outputImage: string;

    if (result?.b64_json) {
      outputImage = `data:image/png;base64,${result.b64_json}`;
    } else if (result?.url) {
      outputImage = result.url;
    } else {
      throw new Error("Nessuna immagine restituita da Together AI");
    }

    return NextResponse.json({
      imageModificata: outputImage,
      promptUsato: editPrompt
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore modifica foto" },
      { status: 500 }
    );
  }
}
