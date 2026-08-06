import Image from "next/image";

export interface MarqueeLogo {
  name: string;
  logo: string;
}

/**
 * Continuous, auto-scrolling logo strip.
 * The track is rendered twice and translated by exactly -50%, so the loop is
 * seamless. Pure CSS — no client JS, no interval timers.
 */
export function LogoMarquee({
  items,
  speed = 40,
  reverse = false,
}: {
  items: MarqueeLogo[];
  /** Seconds for one full loop. Higher = slower. */
  speed?: number;
  reverse?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="marquee group" aria-label="Client logos">
      <ul
        className="marquee-track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...items, ...items].map((p, i) => (
          <li
            key={`${p.name}-${i}`}
            aria-hidden={i >= items.length}
            className="flex h-16 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          >
            <Image
              src={p.logo}
              alt={i >= items.length ? "" : p.name}
              width={144}
              height={64}
              // The track is transformed, so lazy-load never fires for items
              // parked off-screen — they'd pop in blank mid-scroll.
              loading="eager"
              className="h-full w-full rounded-xl object-contain"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
