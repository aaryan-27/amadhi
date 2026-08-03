"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteBlogPost } from "../actions";

export function DeletePostButton({ postId, title }: { postId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Delete ${title}`}
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${title}"? This cannot be undone.`)) {
          startTransition(() => deleteBlogPost(postId));
        }
      }}
      className="inline-flex items-center gap-1 text-xs text-navy-400 hover:text-red-400 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Trash2 className="h-3 w-3" aria-hidden />}
      Delete
    </button>
  );
}
