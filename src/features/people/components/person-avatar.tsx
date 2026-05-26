"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PhotoZoomDialog } from "./photo-zoom-dialog";

interface PersonAvatarProps {
  personId: string;
  firstName: string;
  lastName: string;
  hasPhoto?: boolean;
  /** Veličina u px (default 40). Komponenta je kvadratna. */
  size?: number;
  /** Override class-a za fino podešavanje */
  className?: string;
  /** Suprabriše hashom kad treba forced refresh (npr. posle upload-a). */
  cacheKey?: string | number;
  /**
   * Da li klik na sliku otvara zoom lightbox. Default true kada hasPhoto=true,
   * može se isključiti na mestima gde bi click bilo dvosmisleno (npr. avatar
   * unutar druge clickable kartice).
   */
  enableZoom?: boolean;
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/**
 * Avatar osobe — slika ili inicijali fallback. Click → zoom dialog.
 */
export function PersonAvatar({
  personId,
  firstName,
  lastName,
  hasPhoto,
  size = 40,
  className,
  cacheKey,
  enableZoom = true,
}: PersonAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const showPhoto = hasPhoto && !failed;
  const canZoom = showPhoto && enableZoom;
  const photoUrl = cacheKey
    ? `/api/persons/${personId}/photo?v=${cacheKey}`
    : `/api/persons/${personId}/photo`;

  const fontPx = Math.max(10, Math.round(size * 0.4));

  const avatarInner = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={`${firstName} ${lastName}`}
      width={size}
      height={size}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <span>{initials(firstName, lastName)}</span>
  );

  const baseClass = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary",
    className,
  );
  const style = { width: size, height: size, fontSize: showPhoto ? undefined : fontPx };

  return (
    <>
      {canZoom ? (
        <button
          type="button"
          onClick={(e) => {
            // Spreči da klik bubble-uje do parent-a (npr. row click u tabelama)
            e.stopPropagation();
            setZoomOpen(true);
          }}
          className={cn(baseClass, "cursor-zoom-in transition-transform hover:scale-105")}
          style={style}
          aria-label={`Uvećaj sliku — ${firstName} ${lastName}`}
        >
          {avatarInner}
        </button>
      ) : (
        <div className={baseClass} style={style}>
          {avatarInner}
        </div>
      )}

      {canZoom && (
        <PhotoZoomDialog
          open={zoomOpen}
          onClose={() => setZoomOpen(false)}
          personId={personId}
          firstName={firstName}
          lastName={lastName}
          cacheKey={cacheKey}
        />
      )}
    </>
  );
}
