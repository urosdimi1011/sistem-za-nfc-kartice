import {
  CreditCard,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { getDashboardData } from "@/features/dashboard/queries";
import { getLowStockSummary } from "@/features/inventory/queries";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { DailyRevenueChart } from "@/features/dashboard/components/daily-revenue-chart";
import { TopItemsCard } from "@/features/dashboard/components/top-items-card";
import { BalanceWarningsCard } from "@/features/dashboard/components/balance-warnings-card";
import { LowStockCard } from "@/features/dashboard/components/low-stock-card";
import { RecentActivityCard } from "@/features/dashboard/components/recent-activity-card";

export const dynamic = "force-dynamic";

function formatRsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export default async function DashboardPage() {
  const [data, lowStock] = await Promise.all([
    getDashboardData(),
    getLowStockSummary(),
  ]);
  const { kpis, topItems, employeesNegative, studentsLowBalance, dailyRevenue, recent } =
    data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pregled prometa i stanja u sistemu
        </p>
      </div>

      {/* KPI red */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Danas naplaćeno"
          value={`${formatRsd(kpis.todayRevenue)} RSD`}
          hint={`${kpis.todayTransactionCount} transakcija`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Ovaj mesec"
          value={`${formatRsd(kpis.monthRevenue)} RSD`}
          hint={`${kpis.monthOrderCount} porudžbina`}
          icon={<Wallet className="h-5 w-5" />}
          accent="green"
        />
        <KpiCard
          label="Aktivne osobe"
          value={formatRsd(kpis.activePeople)}
          icon={<Users className="h-5 w-5" />}
          accent="blue"
        />
        <KpiCard
          label="Aktivne kartice"
          value={formatRsd(kpis.activeCards)}
          icon={<CreditCard className="h-5 w-5" />}
          accent="blue"
        />
        <KpiCard
          label="Porudžbine ovog meseca"
          value={formatRsd(kpis.monthOrderCount)}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      {/* Grafik prihoda + top stavke */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyRevenueChart data={dailyRevenue} />
        </div>
        <TopItemsCard items={topItems} />
      </div>

      {/* Balance warnings + low stock */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BalanceWarningsCard
          title="Zaposleni u minusu"
          hint="Treba skinuti od plate u sledećem mesečnom zatvaranju"
          rows={employeesNegative}
          emptyText="Nema zaposlenih u minusu"
          variant="danger"
        />
        <BalanceWarningsCard
          title="Učenici sa malim stanjem"
          hint="Stanje ispod 200 kredita — možda treba uplata roditelja"
          rows={studentsLowBalance}
          emptyText="Svi učenici imaju dovoljno kredita"
          variant="warning"
        />
        <LowStockCard
          outOfStock={lowStock.outOfStock}
          lowStock={lowStock.lowStock}
          items={lowStock.items}
        />
      </div>

      {/* Recent activity */}
      <RecentActivityCard rows={recent} />
    </div>
  );
}
