import { marked } from "marked";
import { slugify } from "@/lib/utils";

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

/**
 * Pull the Q&A pairs out of a post's FAQ section.
 *
 * Search engines and AI assistants read FAQPage structured data to lift a
 * direct answer out of a page, so the markup has to exist — but it must say
 * exactly what the visible page says, or it is misrepresentation. Deriving it
 * from the body rather than storing it separately means the two cannot drift.
 *
 * Shape expected (the content pipeline emits this):
 *   ## Frequently asked questions
 *   ### A question?
 *   The answer, one or more paragraphs.
 */
export function extractFaqs(md: string): { question: string; answer: string }[] {
  const section = md.split(/^##\s+.*frequently asked questions.*$/im)[1];
  if (!section) return [];
  // Stop at the next h2, so later sections aren't swallowed.
  const body = section.split(/^##\s+(?!#)/m)[0];

  const faqs: { question: string; answer: string }[] = [];
  const parts = body.split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const [head, ...rest] = part.split("\n");
    const question = head.trim();
    const answer = rest
      .join("\n")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
      .replace(/[*_`>#]/g, "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs;
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
