"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
}

/** WCAG-compliant accordion used for all FAQ blocks (schema emitted server-side). */
export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  if (!items.length) return null;
  return (
    <div className={cn("divide-y divide-line rounded-2xl border border-line bg-white", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${i}`}
                id={`${baseId}-button-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-navy-900 transition-colors hover:bg-wash min-h-[44px]"
              >
                {item.question}
                <ChevronDown
                  aria-hidden
                  className={cn("h-5 w-5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            <div
              id={`${baseId}-panel-${i}`}
              role="region"
              aria-labelledby={`${baseId}-button-${i}`}
              hidden={!isOpen}
              className="px-5 pb-5 text-[15px] leading-relaxed text-muted"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
