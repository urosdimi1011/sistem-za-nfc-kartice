import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchPeopleForCard } from "@/features/cards/queries";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const cursor = searchParams.get("cursor");

  const result = await searchPeopleForCard(q, cursor);

  return NextResponse.json({
    items: result.items.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      jmbg: p.jmbg,
      personType: p.personType,
      activeCard: p.cards[0] ?? null,
    })),
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  });
}
