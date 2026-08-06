"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import type { Testimonial } from "@/lib/site";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Deterministic monogram tint so each reviewer keeps the same colour. */
const TINTS = [
  "bg-teal-100 text-teal-700",
  "bg-accent-100 text-accent-600",
  "bg-gold-100 text-gold-500",
  "bg-sky-soft text-sky-strong",
  "bg-violet-soft text-violet-strong",
];

export function TestimonialSlider({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      setPerView(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const pages = Math.max(1, items.length - perView + 1);
  const clamped = Math.min(index, pages - 1);

  const scrollTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i] as HTMLElement | undefined;
    if (card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }, []);

  const go = (dir: 1 | -1) => {
    const next = (clamped + dir + pages) % pages;
    setIndex(next);
    scrollTo(next);
  };

  // keep the dots in sync when the user swipes the track directly
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const children = [...track.children] as HTMLElement[];
    const left = track.scrollLeft + track.offsetLeft;
    let nearest = 0;
    let best = Infinity;
    children.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - left);
      if (d < best) { best = d; nearest = i; }
    });
    setIndex(Math.min(nearest, pages - 1));
  };

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        className="scrollbar-thin -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
        aria-label="Client testimonials"
      >
        {items.map((t, i) => (
          <li
            key={t.name}
            className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
          >
            <figure className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card">
              <div className="flex items-center justify-between">
                <Quote className="h-6 w-6 text-teal-400" aria-hidden />
                <span className="flex gap-0.5" aria-label="Rated 5 out of 5">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-gold-400 text-gold-400" aria-hidden />
                  ))}
                </span>
              </div>
              <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-navy-800">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-semibold text-navy-950">{t.name}</span>
                  <span className="block truncate text-xs text-teal-600">
                    {t.persona}
                    {t.company ? ` · ${t.company}` : ""}
                  </span>
                </span>
                {t.logo ? (
                  // Wide slot, no ring: client marks are transparent and run
                  // from 1:1 to 4:1, so a square framed box would letterbox them.
                  <span className="flex h-9 w-20 shrink-0 items-center justify-end">
                    <Image
                      src={t.logo}
                      alt={t.company ?? t.name}
                      width={80}
                      height={36}
                      className="max-h-full w-auto max-w-full object-contain"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                      TINTS[i % TINTS.length]
                    )}
                  >
                    {initials(t.name)}
                  </span>
                )}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {/* controls */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous testimonials"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-navy-800 shadow-sm transition-colors hover:border-navy-400 hover:text-navy-950"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex gap-1.5" role="tablist" aria-label="Testimonial pages">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === clamped}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => { setIndex(i); scrollTo(i); }}
              className={cn(
                "h-2 rounded-full transition-all",
                i === clamped ? "w-6 bg-accent-500" : "w-2 bg-navy-200 hover:bg-navy-300"
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next testimonials"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-navy-800 shadow-sm transition-colors hover:border-navy-400 hover:text-navy-950"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
