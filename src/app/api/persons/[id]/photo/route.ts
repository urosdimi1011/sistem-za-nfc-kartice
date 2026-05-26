import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Servira sliku osobe direktno iz baze.
 * - Tenant scope: vraća sliku samo ako pripada istom tenant-u kao user.
 * - Cache: privatan, 1 dan TTL (slike retko menjaju). ETag = updatedAt timestamp.
 *
 * Klijent (PersonAvatar) koristi src=/api/persons/{id}/photo. Browser cache-uje
 * po URL-u i ETag-u, tako da ponovni renderi ne pogađaju server.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const person = await prisma.person.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { photo: true, photoMime: true, updatedAt: true },
  });

  if (!person || !person.photo) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${person.updatedAt.getTime()}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  const bytes = Buffer.isBuffer(person.photo)
    ? person.photo
    : Buffer.from(person.photo as unknown as ArrayBuffer);

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": person.photoMime ?? "image/webp",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=86400, must-revalidate",
      ETag: etag,
    },
  });
}
