"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MEMES } from "../../lib/memes";

type MemeStyle = "classico" | "moderno" | "speech";

type ApiResponse = {
  caption: string;
  topText: string;
  bottomText: string;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function pickRandomMeme(exclude?: string): string {
  const pool = MEMES.filter((meme) => meme !== exclude);
  const list = pool.length > 0 ? pool : MEMES;
  return list[Math.floor(Math.random() * list.length)];
}

function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeText(text.toUpperCase(), x, y);
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [style, setStyle] = useState<MemeStyle>("classico");
  const [selectedMeme, setSelectedMeme] = useState<string>(MEMES[0]);
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const cardStyle = useMemo(
    () => ({ backgroundColor: "var(--card)", color: "var(--fg)" }),
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedMeme) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = selectedMeme;

    image.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const scale = Math.max(
        CANVAS_WIDTH / image.width,
        CANVAS_HEIGHT / image.height
      );
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const dx = (CANVAS_WIDTH - scaledWidth) / 2;
      const dy = (CANVAS_HEIGHT - scaledHeight) / 2;

      ctx.drawImage(image, dx, dy, scaledWidth, scaledHeight);
      ctx.font = "bold 48px Impact, Arial Black, sans-serif";

      if (style === "classico") {
        drawOutlinedText(ctx, topText, CANVAS_WIDTH / 2, 20);
        drawOutlinedText(ctx, bottomText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);
      }

      if (style === "moderno") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, CANVAS_HEIGHT - 180, CANVAS_WIDTH, 180);

        ctx.font = "bold 42px Impact, Arial Black, sans-serif";
        drawOutlinedText(ctx, topText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 165);

        ctx.font = "bold 36px Impact, Arial Black, sans-serif";
        drawOutlinedText(ctx, bottomText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 95);
      }

      if (style === "speech") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const bubbleX = 70;
        const bubbleY = 40;
        const bubbleWidth = CANVAS_WIDTH - 140;
        const bubbleHeight = 190;
        drawRoundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 28);
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fill();

        ctx.font = "bold 44px Impact, Arial Black, sans-serif";
        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.fillText(topText.toUpperCase(), CANVAS_WIDTH / 2, bubbleY + 28);
        ctx.fillText(bottomText.toUpperCase(), CANVAS_WIDTH / 2, bubbleY + 95);
      }
    };
  }, [selectedMeme, topText, bottomText, style]);

  async function generateCaption(filename: string, selectedStyle: MemeStyle) {
    const response = await fetch("/api/genera-meme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename,
        style: selectedStyle
      })
    });

    if (!response.ok) {
      throw new Error("Errore durante la generazione del testo");
    }

    return (await response.json()) as ApiResponse;
  }

  async function onGenerate(newPhoto: boolean) {
    setLoading(true);
    setError("");

    const targetPhoto = newPhoto ? pickRandomMeme(selectedMeme) : selectedMeme;
    if (newPhoto) {
      setSelectedMeme(targetPhoto);
    }

    try {
      const data = await generateCaption(targetPhoto, style);
      setTopText(data.topText);
      setBottomText(data.bottomText);
    } catch {
      setError("Non sono riuscito a trovare una battuta decente. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function onDownload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "meme-daniele.png";
    link.click();
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            I Meme Daniele
          </h1>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-2xl border border-white/20 px-4 py-2 font-semibold"
            style={cardStyle}
          >
            {theme === "dark" ? "Modalita Luce" : "Modalita Buio"}
          </button>
        </div>

        <section
          className="rounded-3xl border border-black/10 p-4 shadow-xl sm:p-6"
          style={cardStyle}
        >
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              onClick={() => onGenerate(true)}
              className="rounded-2xl bg-[#FFD700] px-6 py-3 text-lg font-black text-black"
            >
              🎲 Genera Meme
            </button>

            <button
              onClick={() => onGenerate(false)}
              className="rounded-2xl border border-white/20 px-5 py-3 font-bold"
              style={cardStyle}
            >
              🔄 Rigenera Testo
            </button>

            <button
              onClick={() => onGenerate(true)}
              className="rounded-2xl border border-white/20 px-5 py-3 font-bold"
              style={cardStyle}
            >
              📸 Cambia Foto
            </button>

            <button
              onClick={onDownload}
              className="rounded-2xl border border-white/20 px-5 py-3 font-bold"
              style={cardStyle}
            >
              💾 Scarica PNG
            </button>
          </div>

          <div className="mb-5">
            <label htmlFor="style" className="mb-2 block text-sm font-semibold">
              Stile Meme
            </label>
            <select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value as MemeStyle)}
              className="w-full rounded-2xl border border-white/20 px-4 py-3"
              style={cardStyle}
            >
              <option value="classico">Classico</option>
              <option value="moderno">Moderno</option>
              <option value="speech">Speech bubble</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-black/20">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="h-auto w-full"
            />
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Sto pensando qualcosa di stupido...
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}