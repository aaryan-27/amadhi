"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building2, Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchSuggestion } from "@/lib/search";

const groupIcon = {
  Localities: MapPin,
  Spaces: Building2,
  Operators: Briefcase,
} as const;

export function SearchBar({
  size = "md",
  placeholder = "Search locality, space or operator…",
  className,
  autoFocus,
}: {
  size?: "md" | "lg";
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchResults = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setResults(data.suggestions ?? []);
      setActive(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchResults(q), 180);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].href);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const grouped = results.reduce<Record<string, SearchSuggestion[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-line bg-white shadow-sm transition-shadow focus-within:shadow-md",
          size === "lg" ? "h-14 px-5" : "h-11 px-4"
        )}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted" aria-hidden />
        ) : (
          <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        )}
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="search-listbox"
          aria-label="Search workspaces"
          autoFocus={autoFocus}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full bg-transparent outline-none placeholder:text-muted/70",
            size === "lg" ? "text-base" : "text-sm"
          )}
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id="search-listbox"
          role="listbox"
          className="absolute z-40 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-line bg-white py-2 shadow-pop scrollbar-thin"
        >
          {Object.entries(grouped).map(([group, items]) => (
            <li key={group}>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {group}
              </p>
              <ul>
                {items.map((r) => {
                  const idx = results.indexOf(r);
                  const Icon = groupIcon[r.group];
                  return (
                    <li key={r.href + r.label} role="option" aria-selected={idx === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(r.href)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                          idx === active && "bg-wash"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy-900">{r.label}</span>
                          <span className="block truncate text-xs text-muted">{r.sublabel}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
