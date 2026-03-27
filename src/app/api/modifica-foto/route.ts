import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, istruzione } = await req.json();

    // Step 1: Groq traduce la richiesta in prompt ottimizzato per SD
    const promptRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Traduci questa richiesta di modifica foto in un prompt in inglese ottimizzato per Stable Diffusion img2img.
Richiesta utente: "${istruzione}"
Rispondi SOLO con il prompt inglese, max 20 parole, nessun testo aggiuntivo.`,
        },
      ],
      max_tokens: 60,
    });

    const prompt = promptRes.choices[0].message.content?.trim() ?? istruzione;

    // Step 2: Cloudflare Workers AI img2img
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/lykon/dreamshaper-8-lcm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          image_b64: base64Data,
          strength: 0.75,
          num_steps: 8,
          guidance: 7.5,
        }),
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.text();
      console.error("CF error:", err);
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
