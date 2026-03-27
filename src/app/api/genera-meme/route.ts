import { NextRequest, NextResponse } from "next/server";

type CaptionResult = {
  caption: string;
  topText: string;
  bottomText: string;
};

function cleanWords(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY non configurata sul server." },
      { status: 500 }
    );
  }

  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BASE_URL non configurata." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const style = typeof body?.style === "string" ? body.style : "classico";

  if (!filename.startsWith("/memes/")) {
    return NextResponse.json(
      { error: "Filename non valido. Deve iniziare con /memes/." },
      { status: 400 }
    );
  }

  const imageUrl = `${normalizeBaseUrl(baseUrl)}${filename}`;

  try {
    const visionResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Descrivi in italiano, in modo oggettivo e breve, cosa succede nella foto."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      return NextResponse.json(
        { error: `Errore Groq Vision: ${errorText}` },
        { status: 502 }
      );
    }

    const visionData = await visionResponse.json();
    const visualDescription =
      visionData?.choices?.[0]?.message?.content ?? "Persona in situazione buffa";

    const captionPrompt = `Sei un autore di meme italiani molto ironico.
Lingua: italiano.
Stile: comico, ironico, esagerato come un meme internet.
Stile grafico selezionato dall'utente: ${style}.
Descrizione della foto: ${visualDescription}

Rispondi SOLO con JSON valido in questo formato:
{"topText":"...","bottomText":"..."}

Regole obbligatorie:
- topText massimo 6 parole
- bottomText massimo 6 parole
- niente emoji
- niente testo fuori dal JSON`;

    const textResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 1,
          messages: [
            {
              role: "user",
              content: captionPrompt
            }
          ]
        })
      }
    );

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      return NextResponse.json(
        { error: `Errore Groq Caption: ${errorText}` },
        { status: 502 }
      );
    }

    const textData = await textResponse.json();
    const rawOutput = textData?.choices?.[0]?.message?.content ?? "";

    const parsed = safeJsonParse<{ topText?: string; bottomText?: string }>(rawOutput);
    const topText = cleanWords(parsed?.topText ?? "QUANDO DICI SOLO UN ATTIMO");
    const bottomText = cleanWords(parsed?.bottomText ?? "MA PARTONO TRE ORE");

    const payload: CaptionResult = {
      topText,
      bottomText,
      caption: `${topText} ${bottomText}`.trim()
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Errore interno durante la generazione del meme." },
      { status: 500 }
    );
  }
}