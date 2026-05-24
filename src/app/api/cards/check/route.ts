import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findCardByUid } from "@/features/cards/queries";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid")?.trim() ?? "";

  if (!uid) {
    return NextResponse.json({ takenBy: null });
  }

  const existing = await findCardByUid(uid);
  return NextResponse.json({
    takenBy: existing
      ? `${existing.person.lastName} ${existing.person.firstName}${
          existing.isActive ? "" : " (blokirana)"
        }`
      : null,
  });
}
