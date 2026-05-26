"use client";

import { useEffect } from "react";

interface PhotoZoomDialogProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  firstName: string;
  lastName: string;
  cacheKey?: string | number;
}

/**
 * Lightbox-style zoom slike osobe.
 *
 * Implementirano kao custom overlay umesto base-ui Dialog-a — razlog:
 * PhotoZoomDialog se otvara IZ PersonAvatar-a koji je sam unutar drugog
 * dijaloga (PersonDetails, CustomerPanel, ...). Stacked Base UI dialogs
 * imaju focus-trap konflikt. Jednostavan fixed overlay sa ESC + klik-van
 * radi bezbedno svuda.
 */
export function PhotoZoomDialog({
  open,
  onClose,
  personId,
  firstName,
  lastName,
  cacheKey,
}: PhotoZoomDialogProps) {
  // ESC zatvara
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Blokiraj scroll na body dok je zoom otvoren
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const photoUrl = cacheKey
    ? `/api/persons/${personId}/photo?v=${cacheKey}`
    : `/api/persons/${personId}/photo`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-label={`Slika — ${firstName} ${lastName}`}
    >
      <div
        className="relative flex max-h-full max-w-full flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={`${firstName} ${lastName}`}
          className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
        />
        <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          {firstName} {lastName}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-200 transition-transform hover:scale-110"
          aria-label="Zatvori"
          title="Zatvori (Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
