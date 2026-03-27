"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MEMES } from "../../lib/memes";

type Stile = "classico" | "moderno" | "bubble";

interface MemeState {
  filename: string;
  imageUrl: string;
  topText: string;
  bottomText: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBattaglia2Ref = useRef<HTMLCanvasElement>(null);

  const [dark, setDark] = useState(true);
  const [stile, setStile] = useState<Stile>("classico");
  const [loading, setLoading] = useState(false);
  const [scurrile, setScurrile] = useState(false);
  const [napoletano, setNapoletano] = useState(false);
  const [assurdita, setAssurdita] = useState(5);
  const [captionCustom, setCaptionCustom] = useState("");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [currentMeme, setCurrentMeme] = useState<MemeState | null>(null);
  const [storia, setStoria] = useState<MemeState[]>([]);
  const [modalitaBattaglia, setModalitaBattaglia] = useState(false);
  const [meme2, setMeme2] = useState<MemeState | null>(null);
  const [vincitore, setVincitore] = useState<1 | 2 | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const disegnaCanvas = useCallback(
    (
      ref: React.RefObject<HTMLCanvasElement | null>,
      imageUrl: string,
      top: string,
      bottom: string
    ) => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        canvas.width = 800;
        canvas.height = 600;

        const scale = Math.min(800 / img.naturalWidth, 600 / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const ox = (800 - dw) / 2;
        const oy = (600 - dh) / 2;

        ctx.fillStyle = dark ? "#0f0f0f" : "#f5f5f5";
        ctx.fillRect(0, 0, 800, 600);
        ctx.drawImage(img, ox, oy, dw, dh);

        if (stile === "classico") {
          const fontSize = 52;
          ctx.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;
          ctx.textAlign = "center";
          ctx.lineWidth = 5;
          ctx.strokeStyle = "#000";
          ctx.fillStyle = "#fff";
          if (top) {
            ctx.strokeText(top.toUpperCase(), 400, 60);
            ctx.fillText(top.toUpperCase(), 400, 60);
          }
          if (bottom) {
            ctx.strokeText(bottom.toUpperCase(), 400, 570);
            ctx.fillText(bottom.toUpperCase(), 400, 570);
          }
        } else if (stile === "moderno") {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 540, 800, 60);
          ctx.font = "bold 28px Inter, sans-serif";
          ctx.fillStyle = "#FFD700";
          ctx.textAlign = "center";
          if (top) ctx.fillText(top, 400, 520);
          if (bottom) ctx.fillText(bottom, 400, 580);
        } else {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 3;
          const bx = 30, by = 20, bw = 740, bh = 90;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 20);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(100, by + bh);
          ctx.lineTo(80, by + bh + 30);
          ctx.lineTo(130, by + bh);
          ctx.fill();
          ctx.stroke();
          ctx.font = "bold 26px Inter, sans-serif";
          ctx.fillStyle = "#000";
          ctx.textAlign = "center";
          if (top) ctx.fillText(top, 400, by + 40);
          if (bottom) ctx.fillText(bottom, 400, by + 75);
        }

        ctx.font = "14px Inter, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "right";
        ctx.fillText("I Meme di Cairo", 795, 595);
      };
    },
    [dark, stile]
  );

  const generaCaption = async (imageUrl: string, filename: string) => {
    const res = await fetch("/api/genera-meme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        imageBase64: uploadedBase64 ?? undefined,
        scurrile,
        assurdita,
        napoletano,
      }),
    });
    if (!res.ok) throw new Error("API 500");
    return res.json() as Promise<{ topText: string; bottomText: string }>;
  };

  const fotoRandom = () => {
    if (uploadedBase64) return { url: uploadedBase64, filename: uploadedFilename ?? "custom" };
    const f = MEMES[Math.floor(Math.random() * MEMES.length)];
    return { url: f, filename: f };
  };

  const generaMeme = async (stessFoto = false) => {
    setErrorMsg(null);
    setLoading(true);
    setModalitaBattaglia(false);
    setVincitore(null);
    try {
      const { url, filename } = stessFoto && currentMeme
        ? { url: currentMeme.imageUrl, filename: currentMeme.filename }
        : fotoRandom();
      const { topText, bottomText } = await generaCaption(url, filename);
      const meme = { filename, imageUrl: url, topText, bottomText };
      setCurrentMeme(meme);
      setStoria((s) => [meme, ...s].slice(0, 6));
    } catch {
      setErrorMsg("Errore API - controlla le variabili d'ambiente su Vercel");
    } finally {
      setLoading(false);
    }
  };

  const avviaBattaglia = async () => {
    setErrorMsg(null);
    setLoading(true);
    setModalitaBattaglia(true);
    setVincitore(null);
    try {
      const foto1 = fotoRandom();
      const foto2 = fotoRandom();
      const [r1, r2] = await Promise.all([
        generaCaption(foto1.url, foto1.filename),
        generaCaption(foto2.url, foto2.filename),
      ]);
      const m1 = { filename: foto1.filename, imageUrl: foto1.url, ...r1 };
      const m2 = { filename: foto2.filename, imageUrl: foto2.url, ...r2 };
      setCurrentMeme(m1);
      setMeme2(m2);
    } catch {
      setErrorMsg("Errore battaglia");
    } finally {
      setLoading(false);
    }
  };

  const applicaCustom = () => {
    if (!currentMeme || !captionCustom.trim()) return;
    const parole = captionCustom.trim().split(" ");
    const meta = Math.ceil(parole.length / 2);
    const top = parole.length > 4 ? parole.slice(0, meta).join(" ") : "";
    const bottom = parole.length > 4 ? parole.slice(meta).join(" ") : captionCustom;
    const meme = { ...currentMeme, topText: top, bottomText: bottom };
    setCurrentMeme(meme);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target?.result as string;
      if (file.size > 1_000_000) {
        const img = new Image();
        img.src = original;
        img.onload = () => {
          const tmp = document.createElement("canvas");
          const maxSide = 1200;
          const scale = Math.min(maxSide / img.width, maxSide / img.height, 1);
          tmp.width = img.width * scale;
          tmp.height = img.height * scale;
          tmp.getContext("2d")?.drawImage(img, 0, 0, tmp.width, tmp.height);
          const compressed = tmp.toDataURL("image/jpeg", 0.8);
          setUploadedBase64(compressed);
          setUploadedFilename(file.name);
        };
      } else {
        setUploadedBase64(original);
        setUploadedFilename(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const scarica = (ref: React.RefObject<HTMLCanvasElement | null>) => {
    const link = document.createElement("a");
    link.download = "meme-cairo.png";
    link.href = ref.current?.toDataURL("image/png") ?? "";
    link.click();
  };

  const condividiWhatsApp = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (navigator.share) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "meme-cairo.png", { type: "image/png" });
        try {
          await navigator.share({ files: [file], title: "I Meme di Cairo" });
        } catch {
          window.open("https://wa.me/?text=Guarda%20questo%20meme%20di%20Cairo!", "_blank");
        }
      });
    } else {
      window.open("https://wa.me/?text=Guarda%20questo%20meme%20di%20Cairo!", "_blank");
    }
  };

  useEffect(() => {
    if (!currentMeme) return;
    disegnaCanvas(canvasRef, currentMeme.imageUrl, currentMeme.topText, currentMeme.bottomText);
  }, [currentMeme, disegnaCanvas]);

  useEffect(() => {
    if (!meme2 || !modalitaBattaglia) return;
    disegnaCanvas(canvasBattaglia2Ref, meme2.imageUrl, meme2.topText, meme2.bottomText);
  }, [meme2, modalitaBattaglia, disegnaCanvas]);

  const bg = dark ? "bg-[#0f0f0f] text-white" : "bg-[#f5f5f5] text-black";
  const card = dark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-200";
  const btn =
    "px-4 py-2 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40";

  return (
    <div className={`min-h-screen ${bg} font-['Inter',sans-serif]`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-[#FFD700]">I Meme di Cairo</h1>
          <button onClick={() => setDark(!dark)} className={`${btn} border ${card}`}>
            {dark ? "Light" : "Dark"}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-xl text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {!modalitaBattaglia ? (
          <div className={`rounded-2xl overflow-hidden border ${card} mb-4`}>
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ display: currentMeme ? "block" : "none" }}
            />
            {!currentMeme && (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Premi Genera Meme per iniziare
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { ref: canvasRef, meme: currentMeme, num: 1 as const },
              { ref: canvasBattaglia2Ref, meme: meme2, num: 2 as const },
            ].map(({ ref, num }) => (
              <div key={num} className={`rounded-2xl overflow-hidden border ${card} ${vincitore === num ? "ring-4 ring-[#FFD700]" : ""}`}>
                <canvas ref={ref} className="w-full" />
                {vincitore === null ? (
                  <button
                    onClick={() => setVincitore(num)}
                    className={`w-full ${btn} bg-[#FFD700] text-black mt-2`}
                  >
                    Questo vince!
                  </button>
                ) : vincitore === num ? (
                  <div className="text-center py-2 font-black text-[#FFD700]">IL VINCITORE!</div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => generaMeme()}
            disabled={loading}
            className={`${btn} bg-[#FFD700] text-black text-base px-6 py-3`}
          >
            {loading ? "Sto pensando qualcosa di stupido..." : "Genera Meme"}
          </button>
          <button onClick={avviaBattaglia} disabled={loading} className={`${btn} bg-purple-600 text-white`}>
            Battaglia
          </button>
          <button onClick={() => generaMeme(true)} disabled={loading || !currentMeme} className={`${btn} border ${card}`}>
            Rigenera testo
          </button>
          <button onClick={() => { setUploadedBase64(null); generaMeme(); }} disabled={loading} className={`${btn} border ${card}`}>
            Cambia foto
          </button>
          {(vincitore === 1 || !modalitaBattaglia) && currentMeme && (
            <>
              <button onClick={() => scarica(canvasRef)} className={`${btn} border ${card}`}>Scarica</button>
              <button onClick={condividiWhatsApp} className={`${btn} bg-[#25D366] text-white`}>WhatsApp</button>
            </>
          )}
          {vincitore === 2 && meme2 && (
            <button onClick={() => scarica(canvasBattaglia2Ref)} className={`${btn} border ${card}`}>Scarica vincitore</button>
          )}
        </div>

        <div className={`rounded-2xl border ${card} p-4 mb-4`}>
          <p className="font-bold mb-2">Carica la tua foto</p>
          <div className="flex items-center gap-3">
            <label className={`${btn} bg-[#FFD700] text-black cursor-pointer`}>
              Scegli foto
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            {uploadedFilename && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-400">{uploadedFilename}</span>
                <button onClick={() => { setUploadedBase64(null); setUploadedFilename(null); }}
                  className="text-xs text-red-400 hover:text-red-300">rimuovi</button>
              </div>
            )}
          </div>
          {uploadedBase64 && (
            <p className="text-xs text-gray-500 mt-1">
              La foto caricata sara usata al posto di quelle random
            </p>
          )}
        </div>

        <div className={`rounded-2xl border ${card} p-4 mb-4`}>
          <p className="font-bold mb-2">Scrivi il tuo testo</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={captionCustom}
              onChange={(e) => setCaptionCustom(e.target.value)}
              maxLength={100}
              placeholder="Scrivi il tuo testo per il meme..."
              className={`flex-1 rounded-xl px-3 py-2 text-sm border ${card} bg-transparent`}
            />
            <button onClick={applicaCustom} disabled={!currentMeme} className={`${btn} bg-[#FFD700] text-black`}>
              Applica
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border ${card} p-4 mb-4`}>
          <p className="font-bold mb-3">Stile e Opzioni</p>

          <div className="flex gap-2 mb-4">
            {(["classico", "moderno", "bubble"] as Stile[]).map((s) => (
              <button
                key={s}
                onClick={() => setStile(s)}
                className={`${btn} border capitalize ${stile === s ? "bg-[#FFD700] text-black border-[#FFD700]" : card}`}
              >
                {s === "classico" ? "Classico" : s === "moderno" ? "Moderno" : "Bubble"}
              </button>
            ))}
          </div>

          <div className="flex gap-6 mb-4">
            {[
              { label: "Scurrile", val: scurrile, set: setScurrile },
              { label: "Napoletano", val: napoletano, set: setNapoletano },
            ].map(({ label, val, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set(!val)}
                  className={`w-11 h-6 rounded-full transition-colors ${val ? "bg-[#FFD700]" : "bg-gray-600"} relative`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${val ? "left-6" : "left-1"}`} />
                </div>
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium">
              Livello Assurdita: <span className="text-[#FFD700] font-black">{assurdita}</span>
            </label>
            <input
              type="range" min={1} max={10} value={assurdita}
              onChange={(e) => setAssurdita(Number(e.target.value))}
              className="w-full mt-1 accent-[#FFD700]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 - Normale</span>
              <span>5 - Surreale</span>
              <span>10 - Folle</span>
            </div>
          </div>
        </div>

        {storia.length > 1 && (
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className="font-bold mb-3">Ultimi meme</p>
            <div className="grid grid-cols-3 gap-2">
              {storia.slice(1).map((m, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMeme(m)}
                  className="rounded-xl overflow-hidden border border-[#333] hover:border-[#FFD700] transition-all"
                >
                  <img src={m.imageUrl} alt="" className="w-full h-20 object-cover" />
                  <p className="text-xs p-1 truncate">{m.bottomText}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}