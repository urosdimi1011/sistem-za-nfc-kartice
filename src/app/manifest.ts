import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * PWA manifest — Next.js generiše /manifest.webmanifest.
 * Dinamičan jer naziv aplikacije zavisi od tenant-a.
 *
 * Za single-tenant deploy (sada), uzimamo prvi aktivan tenant kao default.
 * Za multi-tenant kasnije (subdomain routing), prosleđivao bi se host header.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const tenant = await prisma.tenant
    .findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { name: true },
    })
    .catch(() => null);

  const tenantName = tenant?.name ?? "Bar sistem";
  const fullName = `${tenantName} - Sistem za kartice`;
  // Kratki naziv za ikonu na desktopu/home-screenu (≤12 znakova lepo staje)
  const shortName =
    tenantName.length > 12 ? tenantName.slice(0, 12) : tenantName;

  return {
    name: fullName,
    short_name: shortName,
    description:
      "Sistem za upravljanje karticama, kreditima i porudžbinama u baru.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#7f1010", // primary (bordo)
    lang: "sr-Latn",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/img/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/img/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/img/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
