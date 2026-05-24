"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Check, ChevronsUpDown, CreditCard, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PersonTypeLabel, type PersonType } from "@/lib/enums";
import { usePeopleSearch } from "../hooks/use-people-search";

export interface ComboboxPerson {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string | null;
  personType: PersonType;
  activeCard: { id: string; uid: string } | null;
}

interface PersonComboboxProps {
  value: ComboboxPerson | null;
  onChange: (person: ComboboxPerson | null) => void;
  autoFocus?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const SCROLL_THRESHOLD = 80;

export function PersonCombobox({ value, onChange, autoFocus }: PersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePeopleSearch(debouncedQuery, open);

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  useEffect(() => setMounted(true), []);
  useEffect(() => setActiveIndex(0), [debouncedQuery]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  };

  const select = (p: ComboboxPerson) => {
    onChange(p);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[activeIndex]) {
      e.preventDefault();
      select(items[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={triggerRef} className="relative">
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">
              {value.lastName} {value.firstName}
            </span>
            <Badge variant={value.personType === "EMPLOYEE" ? "default" : "secondary"}>
              {PersonTypeLabel[value.personType]}
            </Badge>
            {value.activeCard && (
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
                <CreditCard className="h-3 w-3" />
                Već ima karticu
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            ref={inputRef}
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Pretraži osobu po imenu ili JMBG-u..."
            className="pl-9 pr-9"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
          )}
        </div>
      )}

      {mounted && open && !value && pos &&
        createPortal(
          <div
            ref={dropdownRef}
            onScroll={handleScroll}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 100,
            }}
            className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            {isLoading && items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-500">Pretraga...</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                {query ? "Nema rezultata" : "Počni da kucaš ili biraj iz liste"}
              </div>
            ) : (
              <>
                {items.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIndex
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-medium">
                        {p.lastName} {p.firstName}
                        {idx === activeIndex && <Check className="h-3 w-3 text-primary" />}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-zinc-500">
                        <Badge
                          variant={p.personType === "EMPLOYEE" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {PersonTypeLabel[p.personType]}
                        </Badge>
                        {p.jmbg && <span className="font-mono">{p.jmbg}</span>}
                      </span>
                    </div>
                    {p.activeCard && (
                      <Badge variant="outline" className="gap-1 border-amber-500/40 text-xs text-amber-600">
                        <CreditCard className="h-3 w-3" />
                        Ima karticu
                      </Badge>
                    )}
                  </button>
                ))}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Učitavam još...
                  </div>
                )}
                {!hasNextPage && items.length > 0 && (
                  <div className="py-2 text-center text-[11px] text-zinc-400">
                    Nema više rezultata
                  </div>
                )}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
