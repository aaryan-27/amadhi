"use client";

/**
 * Account-free user state — localStorage only (hard constraint: no user auth).
 * Wishlist, Recently Viewed and Compare (max 3) with a tiny event bus so
 * every mounted component stays in sync.
 */

export interface StoredListing {
  slug: string;
  name: string;
  locality: string;
  city: string;
  image: string | null;
  fromPrice: number | null;
  addedAt: number;
}

const KEYS = {
  wishlist: "amadhi:wishlist",
  recent: "amadhi:recently-viewed",
  compare: "amadhi:compare",
} as const;

type StoreKey = keyof typeof KEYS;

const listeners = new Set<() => void>();
export function subscribeStore(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function emit() {
  listeners.forEach((fn) => fn());
}

function read(key: StoreKey): StoredListing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS[key]) ?? "[]");
  } catch {
    return [];
  }
}

function write(key: StoreKey, items: StoredListing[]) {
  localStorage.setItem(KEYS[key], JSON.stringify(items));
  emit();
}

export const store = {
  get: read,

  toggle(key: "wishlist" | "compare", item: Omit<StoredListing, "addedAt">) {
    const items = read(key);
    const exists = items.some((i) => i.slug === item.slug);
    if (exists) {
      write(key, items.filter((i) => i.slug !== item.slug));
      return false;
    }
    const max = key === "compare" ? 3 : 100;
    if (items.length >= max) {
      if (key === "compare") return "full" as const;
      items.shift();
    }
    write(key, [...items, { ...item, addedAt: Date.now() }]);
    return true;
  },

  has(key: StoreKey, slug: string) {
    return read(key).some((i) => i.slug === slug);
  },

  remove(key: StoreKey, slug: string) {
    write(key, read(key).filter((i) => i.slug !== slug));
  },

  clear(key: StoreKey) {
    write(key, []);
  },

  pushRecent(item: Omit<StoredListing, "addedAt">) {
    const items = read("recent").filter((i) => i.slug !== item.slug);
    items.unshift({ ...item, addedAt: Date.now() });
    write("recent", items.slice(0, 12));
  },
};

/** Capture UTM params once per session for lead attribution. */
export function captureUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const KEY = "amadhi:utm";
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"]) {
    const v = params.get(k);
    if (v) utm[k] = v;
  }
  if (Object.keys(utm).length) {
    sessionStorage.setItem(KEY, JSON.stringify(utm));
    return utm;
  }
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
