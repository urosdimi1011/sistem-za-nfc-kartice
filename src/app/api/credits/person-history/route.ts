import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentTransactionsForPerson } from "@/features/credits/queries";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");
  if (!personId) {
    return NextResponse.json({ error: "Missing personId" }, { status: 400 });
  }

  const items = await getRecentTransactionsForPerson(personId, 5);
  return NextResponse.json({ items });
}
