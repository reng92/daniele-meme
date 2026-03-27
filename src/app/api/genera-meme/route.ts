import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { filename, imageBase64, scurrile, assurdita, napoletano } = await req.json();

    const imageUrl = imageBase64
      ? imageBase64
      : `${process.env.NEXT_PUBLIC_BASE_URL}${filename}`;

    const visionRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: "Descrivi brevemente cosa vedi in questa foto in italiano. Max 3 frasi.",
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const descrizione = visionRes.choices[0].message.content || "";

    const promptCaption = `Sei un generatore di meme italiano.
Basandoti su questa descrizione di una foto: "${descrizione}"

Genera una caption meme COMICA in italiano.
Livello di assurdita da 1 a 10: ${assurdita ?? 5}. (1=normale, 10=completamente folle e senza senso logico)
${scurrile ? "Stile: volgare, irriverente, senza censure, parolacce incluse. Stile meme italiano senza freni." : "Stile: divertente e ironico, adatto a tutti."}
${napoletano ? "Scrivi ESCLUSIVAMENTE in dialetto napoletano autentico. Usa: uaglio, mannaggia, che pazz, jamm bell, maronn." : "Scrivi in italiano standard."}

Rispondi SOLO con un JSON valido, nessun testo fuori dal JSON:
{"topText": "max 6 parole", "bottomText": "max 6 parole"}`;

    const captionRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: promptCaption }],
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const raw = captionRes.choices[0].message.content || "{}";
    const { topText, bottomText } = JSON.parse(raw);

    return NextResponse.json({ topText: topText || "", bottomText: bottomText || descrizione });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Errore generazione meme" }, { status: 500 });
  }
}