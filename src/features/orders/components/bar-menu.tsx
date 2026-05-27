"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { getColorPreset } from "@/lib/menu-presets";
import { MenuIcon } from "@/components/ui/menu-icon";

export type BarMenuLayout = "grid" | "list";

export interface BarMenuCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    creditPrice: number;
    // Out-of-stock stavke se prikazuju sa "NEMA NA STANJU" overlay-em, ne kriju.
    // Konobar vidi šta postoji u meniju da bi obavestio mušteriju.
    trackStock: boolean;
    stock: number;
    lowStockThreshold: number;
    isAvailable: boolean;
  }>;
}

interface BarMenuProps {
  categories: BarMenuCategory[];
  layout: BarMenuLayout;
  search: string;
  onAddToCart: (itemId: string) => void;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

// Helper: ne razlikuje velika/mala slova i ignoriše dijakritike
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface SearchResult {
  item: BarMenuCategory["items"][number];
  category: BarMenuCategory;
}

export function BarMenu({ categories, layout, search, onAddToCart }: BarMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    categories[0]?.id ?? "",
  );

  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch.length > 0;

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!isSearching) return [];
    const term = normalize(trimmedSearch);
    const results: SearchResult[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        if (
          normalize(item.name).includes(term) ||
          (item.description && normalize(item.description).includes(term))
        ) {
          results.push({ item, category: cat });
        }
      }
    }
    return results;
  }, [isSearching, trimmedSearch, categories]);

  if (categories.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-zinc-500">
        Karta pića još nije pripremljena.
      </div>
    );
  }

  const active = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  const preset = getColorPreset(active.color);

  // Tile renderer
  const renderTile = (
    item: BarMenuCategory["items"][number],
    cat: BarMenuCategory,
  ) => {
    const catPreset = getColorPreset(cat.color);
    const icon = item.icon ?? cat.icon;
    const outOfStock = item.trackStock && item.stock <= 0;
    const isLow =
      item.trackStock && !outOfStock && item.stock <= item.lowStockThreshold;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => !outOfStock && onAddToCart(item.id)}
        disabled={outOfStock}
        className={cn(
          "group relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-xl border-2 p-3 transition-all",
          outOfStock
            ? "cursor-not-allowed border-red-500/40 bg-red-50/60 dark:bg-red-950/20"
            : cn(
                catPreset.border,
                catPreset.bg,
                "hover:scale-105 active:scale-95",
              ),
        )}
        title={
          outOfStock
            ? `${item.name} — nema na stanju`
            : (item.description ?? item.name)
        }
      >
        {isLow && (
          <span
            className="absolute left-1 top-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
            title={`Još ${item.stock} na stanju`}
          >
            {item.stock} kom
          </span>
        )}
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center",
            outOfStock && "opacity-30 grayscale",
          )}
        >
          <MenuIcon name={icon} className={cn("h-8 w-8", catPreset.text)} />
          <p className="mt-2 line-clamp-2 text-center text-sm font-semibold leading-tight">
            {item.name}
          </p>
        </div>
        <p
          className={cn(
            "text-lg font-bold tabular-nums",
            outOfStock ? "text-zinc-400 line-through" : catPreset.text,
          )}
        >
          {formatPrice(item.creditPrice)}
        </p>

        {/* OUT OF STOCK overlay — dijagonalna traka preko cele pločice */}
        {outOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[140%] rotate-[-12deg] bg-red-600 py-1 text-center text-xs font-extrabold uppercase tracking-wider text-white shadow-lg">
              Nema na stanju
            </div>
          </div>
        )}

        {!outOfStock && (
          <span className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:flex">
            <Plus className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    );
  };

  const renderRow = (
    item: BarMenuCategory["items"][number],
    cat: BarMenuCategory,
  ) => {
    const catPreset = getColorPreset(cat.color);
    const icon = item.icon ?? cat.icon;
    const outOfStock = item.trackStock && item.stock <= 0;
    const isLow =
      item.trackStock && !outOfStock && item.stock <= item.lowStockThreshold;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => !outOfStock && onAddToCart(item.id)}
        disabled={outOfStock}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
          outOfStock
            ? "cursor-not-allowed border-red-500/40 bg-red-50/60 dark:bg-red-950/20"
            : cn(
                catPreset.border,
                catPreset.bg,
                "hover:scale-[1.01] active:scale-[0.99]",
              ),
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            catPreset.badge,
            outOfStock && "opacity-30 grayscale",
          )}
        >
          <MenuIcon name={icon} className="h-6 w-6 text-white" />
        </div>
        <div className={cn("flex-1 min-w-0", outOfStock && "opacity-50")}>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "font-medium",
                outOfStock && "line-through",
              )}
            >
              {item.name}
            </p>
            {outOfStock && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Nema na stanju
              </span>
            )}
            {isLow && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                {item.stock} kom
              </span>
            )}
          </div>
          {item.description && (
            <p className="truncate text-xs text-zinc-500">{item.description}</p>
          )}
          {isSearching && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
              {cat.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              outOfStock ? "text-zinc-400 line-through" : catPreset.text,
            )}
          >
            {formatPrice(item.creditPrice)}
          </span>
          {!outOfStock && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabovi — sakriveni dok je pretraga aktivna */}
      {!isSearching && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {categories.map((cat) => {
            const catPreset = getColorPreset(cat.color);
            const isActive = cat.id === active.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? `${catPreset.border} ${catPreset.bg} ${catPreset.text}`
                    : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                )}
              >
                <MenuIcon name={cat.icon} className="h-4 w-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Sadržaj */}
      <div className="flex-1 overflow-y-auto p-4">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              Nema rezultata za "{trimmedSearch}".
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                {searchResults.length} rezultat
                {searchResults.length === 1 ? "" : "a"} za "
                <strong>{trimmedSearch}</strong>"
              </p>
              {layout === "grid" ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {searchResults.map(({ item, category }) =>
                    renderTile(item, category),
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(({ item, category }) => renderRow(item, category))}
                </div>
              )}
            </div>
          )
        ) : active.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Nema stavki u ovoj kategoriji.
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {active.items.map((item) => renderTile(item, active))}
          </div>
        ) : (
          <div className="space-y-2">
            {active.items.map((item) => renderRow(item, active))}
          </div>
        )}
      </div>
    </div>
  );
}
