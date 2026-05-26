import { listAvailableMenu } from "@/features/menu/queries";
import { getBarSessionStats } from "@/features/orders/queries";
import { BarTerminal } from "@/features/orders/components/bar-terminal";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const [categories, stats] = await Promise.all([
    listAvailableMenu(),
    getBarSessionStats(),
  ]);

  return <BarTerminal categories={categories} initialStats={stats} />;
}
