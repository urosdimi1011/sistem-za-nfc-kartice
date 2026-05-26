"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { lookupCardAction, createOrderAction } from "../actions";
import type { BarCardLookup } from "../service";
import { ScanWaiting } from "./scan-waiting";
import { BarMenu, type BarMenuCategory, type BarMenuLayout } from "./bar-menu";
import { CustomerPanel, type CartLine } from "./customer-panel";
import { LayoutToggle } from "./layout-toggle";

const LAYOUT_STORAGE_KEY = "bar-menu-layout";

interface BarTerminalProps {
  categories: BarMenuCategory[];
  initialStats: { todayOrderCount: number; todayRevenue: number };
}

interface BlockedInfo {
  name: string;
  reason: string;
}

interface SuccessInfo {
  personName: string;
  totalCredits: number;
  newBalance: number;
}

const AUTO_RESET_AFTER_SUCCESS_MS = 3000;

export function BarTerminal({
  categories,
  initialStats,
}: BarTerminalProps) {
  const [lookup, setLookup] = useState<BarCardLookup | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [blockedInfo, setBlockedInfo] = useState<BlockedInfo | null>(null);
  const [, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [menuLayout, setMenuLayout] = useState<BarMenuLayout>("grid");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(initialStats);

  // Hidratiraj layout iz localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === "grid" || saved === "list") setMenuLayout(saved);
  }, []);

  const updateLayout = (l: BarMenuLayout) => {
    setMenuLayout(l);
    localStorage.setItem(LAYOUT_STORAGE_KEY, l);
  };

  // Mapa za brzi pristup stavkama menija po ID-u
  const menuItems = new Map(
    categories.flatMap((c) =>
      c.items.map((i) => [i.id, { ...i, categoryColor: c.color }]),
    ),
  );

  const reset = useCallback(() => {
    setLookup(null);
    setCart([]);
    setLookupError(null);
    setBlockedInfo(null);
  }, []);

  // Auto-reset posle uspeha
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      setSuccess(null);
      reset();
    }, AUTO_RESET_AFTER_SUCCESS_MS);
    return () => clearTimeout(t);
  }, [success, reset]);

  const handleScan = useCallback(
    async (uid: string) => {
      if (lookupPending || lookup || success || blockedInfo) return;
      setLookupPending(true);
      setLookupError(null);
      setBlockedInfo(null);
      try {
        const result = await lookupCardAction(uid);
        if (!result.ok) {
          setLookupError(result.error);
          return;
        }
        if (!result.data) {
          setLookupError(`Kartica "${uid}" nije registrovana`);
          return;
        }

        const card = result.data;
        const fullName = `${card.person.firstName} ${card.person.lastName}`;

        // Provera pre nego što se uđe u meni — bolji UX nego da se otkrije pri naplati
        if (!card.isActive) {
          setBlockedInfo({
            name: fullName,
            reason: "Ova kartica je deaktivirana. Obavesti administratora.",
          });
          return;
        }
        if (!card.person.isActive) {
          setBlockedInfo({
            name: fullName,
            reason: "Osoba nije aktivna u sistemu.",
          });
          return;
        }

        setLookup(card);
      } finally {
        setLookupPending(false);
      }
    },
    [lookupPending, lookup, success, blockedInfo],
  );

  const handleAddToCart = (itemId: string) => {
    const menu = menuItems.get(itemId);
    if (!menu) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === itemId);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === itemId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          menuItemId: itemId,
          name: menu.name,
          unitPrice: menu.creditPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleIncrement = (itemId: string) => {
    setCart((prev) =>
      prev.map((l) =>
        l.menuItemId === itemId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
  };

  const handleDecrement = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.menuItemId === itemId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const handleRemove = (itemId: string) => {
    setCart((prev) => prev.filter((l) => l.menuItemId !== itemId));
  };

  const totalCredits = cart.reduce(
    (sum, l) => sum + l.unitPrice * l.quantity,
    0,
  );

  const handleConfirm = () => {
    if (!lookup || cart.length === 0) return;
    setIsConfirming(true);
    startTransition(async () => {
      try {
        const result = await createOrderAction({
          cardId: lookup.cardId,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
          })),
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setSuccess({
          personName: result.data!.personName,
          totalCredits: result.data!.totalCredits,
          newBalance: result.data!.newBalance,
        });
        // Inkrement live brojača — vide se odmah na scan ekranu
        setStats((s) => ({
          todayOrderCount: s.todayOrderCount + 1,
          todayRevenue: s.todayRevenue + result.data!.totalCredits,
        }));
      } finally {
        setIsConfirming(false);
      }
    });
  };

  // ESC briše lookup (vraća na scan)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lookup && !isConfirming) {
        reset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lookup, isConfirming, reset]);

  if (success) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-green-50 p-8 text-center dark:bg-green-950/20">
        <CheckCircle2 className="h-32 w-32 text-green-600" />
        <h2 className="mt-6 text-4xl font-bold text-green-700 dark:text-green-300">
          Naplaćeno!
        </h2>
        <p className="mt-3 text-xl">{success.personName}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {new Intl.NumberFormat("sr-RS").format(success.totalCredits)} RSD
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Novo stanje:{" "}
          <span className="font-medium tabular-nums">
            {new Intl.NumberFormat("sr-RS").format(success.newBalance)}
          </span>
        </p>
        <p className="mt-8 text-xs text-zinc-400">
          Sledeći klijent za nekoliko sekundi...
        </p>
      </div>
    );
  }

  if (!lookup) {
    return (
      <ScanWaiting
        onScan={handleScan}
        isProcessing={lookupPending}
        errorMessage={lookupError}
        blockedInfo={blockedInfo}
        onClearError={() => {
          setLookupError(null);
          setBlockedInfo(null);
        }}
        todayOrderCount={stats.todayOrderCount}
        todayRevenue={stats.todayRevenue}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: pretraga + layout toggle */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Pretraži stavku..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              title="Obriši pretragu"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <LayoutToggle value={menuLayout} onChange={updateLayout} />
      </div>

      {/* Glavni grid: meni + korpa */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_22rem]">
        <div className="min-h-0 overflow-hidden">
          <BarMenu
            categories={categories}
            layout={menuLayout}
            search={search}
            onAddToCart={handleAddToCart}
          />
        </div>
        <div className="min-h-0 overflow-hidden border-l border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <CustomerPanel
            lookup={lookup}
            cart={cart}
            totalCredits={totalCredits}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onConfirm={handleConfirm}
            onCancel={reset}
            isConfirming={isConfirming}
          />
        </div>
      </div>
    </div>
  );
}
