/**
 * "Random" selections that change once a day.
 *
 * Seeded by the calendar date rather than Math.random(), so every visitor and
 * every server instance sees the same picks all day, cached pages stay valid,
 * and the set turns over at midnight India time.
 */

/** Today's date in India as YYYY-MM-DD — the rotation key. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** FNV-1a: turns the date string into a 32-bit seed. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, seedable PRNG. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle that always gives the same order for the same seed. */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const rand = seededRandom(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` items for `day`, spread evenly across groups (cities).
 *
 * Each group is shuffled on its own, then the groups take turns, so eight
 * picks across three cities land 3/3/2. The group order is shuffled too, which
 * rotates which city gets the smaller share from one day to the next.
 *
 * Input is sorted by id first, so the result does not depend on the order the
 * database happened to return rows in.
 */
export function pickDaily<T extends { id: string }>(
  items: readonly T[],
  opts: { count: number; day: string; groupOf: (item: T) => string }
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const key = opts.groupOf(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const groupOrder = shuffleWithSeed([...groups.keys()].sort(), `${opts.day}:groups`);
  const queues = groupOrder.map((key) => shuffleWithSeed(groups.get(key)!, `${opts.day}:${key}`));

  const picked: T[] = [];
  for (let round = 0; picked.length < opts.count; round++) {
    let added = false;
    for (const queue of queues) {
      if (round < queue.length && picked.length < opts.count) {
        picked.push(queue[round]);
        added = true;
      }
    }
    if (!added) break; // pool exhausted
  }
  return picked;
}
