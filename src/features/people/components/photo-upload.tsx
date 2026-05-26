"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  /** Početna slika (pri editu) — bilo data URL ili src koji vodi do API endpoint-a */
  initialSrc?: string | null;
  /** Pošalji optimizovani data URL roditelju kad se promeni / ili null ako uklonjeno */
  onChange: (dataUrl: string | null) => void;
}

/**
 * Client-side optimizacija pre upload-a:
 *   • File picker prihvata bilo koju sliku
 *   • Canvas resize na 400x400 sa center-crop (kvadrat, fokus na centar = lice)
 *   • Konverzija u WebP @ 85% kvalitet
 *   • Tipično ~25-45 KB izlaz iz sirovih 2-5 MB sa kamere
 *
 * Bytes ne upload-ujemo nego data URL string — server akcija ga parsuje i snima
 * direktno u Postgres Bytes kolonu.
 */
const TARGET_SIZE = 400;
const WEBP_QUALITY = 0.85;

export function PhotoUpload({ initialSrc, onChange }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialSrc ?? null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Mora biti slika");
      return;
    }
    // Hard upper limit ulaz — sprečava 50MB monster files
    if (file.size > 20 * 1024 * 1024) {
      setError("Slika je prevelika (max 20 MB)");
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await resizeAndCompress(file);
      setPreview(dataUrl);
      onChange(dataUrl);
    } catch (e) {
      console.error(e);
      setError("Greška pri obradi slike");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview kvadrat */}
      <div
        className={cn(
          "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed",
          preview
            ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
            : "border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900",
        )}
      >
        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pregled"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-8 w-8" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          // capture="user" otvara front kameru na mobilnom
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
          >
            {preview ? (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Promeni
              </>
            ) : (
              <>
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                Dodaj sliku
              </>
            )}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={processing}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Ukloni
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Najbolji rezultat: lice centrirano u kadru. Slika se automatski
          smanjuje i komprimuje (kvadrat, ~30 KB).
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

// ─── Client-side image processing ──────────────────────────

async function resizeAndCompress(file: File): Promise<string> {
  // 1. Učitaj sliku
  const imageBitmap = await loadImage(file);

  // 2. Center-crop u kvadrat (sečemo manju dimenziju)
  const side = Math.min(imageBitmap.width, imageBitmap.height);
  const sx = (imageBitmap.width - side) / 2;
  const sy = (imageBitmap.height - side) / 2;

  // 3. Canvas na TARGET_SIZE × TARGET_SIZE
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context nije dostupan");

  // High-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imageBitmap,
    sx,
    sy,
    side,
    side, // source crop
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE, // destination
  );

  // 4. Konverzija u WebP
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
  );
  if (!blob) throw new Error("Konverzija u WebP nije uspela");

  return blobToDataUrl(blob);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
