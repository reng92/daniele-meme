import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, istruzione } = await req.json();

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: istruzione,
          image: base64Data,
          parameters: {
            num_inference_steps: 20,
            image_guidance_scale: 1.5,
            guidance_scale: 7,
          },
        }),
      }
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      if (errText.includes("loading")) {
        return NextResponse.json(
          { error: "Il modello si sta avviando, riprova tra 20 secondi" },
          { status: 503 }
        );
      }
      throw new Error(`HF error: ${errText}`);
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const outputBase64 = `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    return NextResponse.json({ imageModificata: outputBase64 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Errore modifica foto" }, { status: 500 });
  }
}
