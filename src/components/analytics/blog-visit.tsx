"use client";

import { useEffect } from "react";
import { rememberBlogVisit } from "@/lib/store";

/** Records that this blog post was read, for lead attribution in the CRM. */
export function BlogVisit({ slug }: { slug: string }) {
  useEffect(() => rememberBlogVisit(slug), [slug]);
  return null;
}
