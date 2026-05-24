import { listAvailableMenu } from "@/features/menu/queries";
import { BarTerminal } from "@/features/orders/components/bar-terminal";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const categories = await listAvailableMenu();
  return <BarTerminal categories={categories} />;
}
