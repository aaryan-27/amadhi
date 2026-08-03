"use client";

import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { moderateReview } from "../actions";

export function ModerateButtons({ reviewId, status }: { reviewId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  if (pending) return <Loader2 className="h-4 w-4 animate-spin text-navy-400" aria-label="Working" />;
  return (
    <div className="flex gap-2">
      {status !== "approved" && (
        <button
          type="button"
          onClick={() => startTransition(() => moderateReview(reviewId, "approved"))}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25"
        >
          <Check className="h-3.5 w-3.5" aria-hidden /> Approve
        </button>
      )}
      {status !== "rejected" && (
        <button
          type="button"
          onClick={() => startTransition(() => moderateReview(reviewId, "rejected"))}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-red-500/15 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/25"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> Reject
        </button>
      )}
    </div>
  );
}
