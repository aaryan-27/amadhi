import { marked } from "marked";
import { slugify } from "@/lib/utils";

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

/** Render trusted (admin-authored) markdown → HTML with heading ids + TOC. */
export function renderMarkdown(md: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    if (depth <= 3) toc.push({ id, text, depth });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  const html = marked.parse(md, { renderer, async: false }) as string;
  return { html, toc };
}
