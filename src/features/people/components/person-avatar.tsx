"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  personId: string;
  firstName: string;
  lastName: string;
  hasPhoto?: boolean;
  /** Veličina u px (default 40). Komponenta je kvadratna. */
  size?: number;
  /** Override class-a za fino podešavanje (npr. font-size kod inicijala) */
  className?: string;
  /** Suprabriše hashom kad treba forced refresh (npr. posle upload-a). */
  cacheKey?: string | number;
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/**
 * Avatar osobe — pokazuje sliku iz /api/persons/{id}/photo ako postoji
 * (hasPhoto=true), inače fallback na inicijale u krugu.
 * Onerror handler vraća inicijale ako URL slike padne iz nekog razloga.
 */
export function PersonAvatar({
  personId,
  firstName,
  lastName,
  hasPhoto,
  size = 40,
  className,
  cacheKey,
}: PersonAvatarProps) {
  const [failed, setFailed] = useState(false);

  const showPhoto = hasPhoto && !failed;
  const photoUrl = cacheKey
    ? `/api/persons/${personId}/photo?v=${cacheKey}`
    : `/api/persons/${personId}/photo`;

  // Skala fonta inicijala po veličini avatara
  const fontPx = Math.max(10, Math.round(size * 0.4));

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary",
        className,
      )}
      style={{ width: size, height: size, fontSize: showPhoto ? undefined : fontPx }}
    >
      {showPhoto ? (
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
      )}
    </div>
  );
}
