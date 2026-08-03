"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Loader2, Check, Code2, Type,
} from "lucide-react";
import { saveBlogPost } from "../../actions";
import { cn, slugify } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-navy-700 bg-navy-950 px-3.5 py-2.5 text-sm text-navy-100 placeholder:text-navy-500 focus:border-cream-200 outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-navy-200";

interface PostInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  categoryId: string;
  authorId: string;
  seoTitle: string;
  seoDesc: string;
  status: string;
}

export function BlogEditor({
  post,
  categories,
  authors,
}: {
  post: PostInput | null;
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"rich" | "markdown">(post?.body?.trim().startsWith("<") ? "rich" : "markdown");
  const [form, setForm] = useState<PostInput>(
    post ?? {
      title: "", slug: "", excerpt: "", body: "", coverImage: "",
      categoryId: categories[0]?.id ?? "", authorId: authors[0]?.id ?? "",
      seoTitle: "", seoDesc: "", status: "draft",
    }
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: mode === "rich" ? form.body : "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-amadhi min-h-64 max-w-none rounded-b-xl border border-t-0 border-navy-700 bg-navy-950 px-4 py-3 text-navy-100 outline-none [&_h2]:text-cream-100 [&_h3]:text-cream-100 [&_p]:text-navy-200",
      },
    },
  });

  const save = () => {
    const body = mode === "rich" ? (editor?.getHTML() ?? form.body) : form.body;
    startTransition(async () => {
      const result = await saveBlogPost({ ...form, body });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (!form.id) router.replace(`/admin/blog/${result.id}`);
    });
  };

  const toolbarBtn = (
    label: string,
    Icon: React.ElementType,
    onClick: () => void,
    active?: boolean
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active ? "bg-accent-500/20 text-accent-400" : "text-navy-300 hover:bg-navy-800 hover:text-cream-100"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="bp-title">Title</label>
          <input
            id="bp-title"
            required
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                title: e.target.value,
                slug: f.id ? f.slug : slugify(e.target.value),
                seoTitle: f.seoTitle || e.target.value,
              }))
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="bp-slug">Slug</label>
          <input id="bp-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="bp-cover">Cover image URL</label>
          <input id="bp-cover" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className={inputCls} placeholder="https://res.cloudinary.com/…" />
        </div>
        <div>
          <label className={labelCls} htmlFor="bp-category">Category</label>
          <select id="bp-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="bp-author">Author</label>
          <select id="bp-author" value={form.authorId} onChange={(e) => setForm({ ...form, authorId: e.target.value })} className={inputCls}>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="bp-excerpt">Excerpt</label>
          <textarea id="bp-excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inputCls} />
        </div>
      </div>

      {/* Body editor: Tiptap rich text ⇄ raw markdown */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={labelCls.replace("mb-1.5 ", "")}>Body</span>
          <div className="flex gap-1 rounded-lg bg-navy-900 p-1">
            <button
              type="button"
              aria-pressed={mode === "rich"}
              onClick={() => {
                if (mode === "markdown") {
                  editor?.commands.setContent(form.body);
                  setMode("rich");
                }
              }}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", mode === "rich" ? "bg-navy-700 text-cream-100" : "text-navy-400")}
            >
              <Type className="h-3.5 w-3.5" aria-hidden /> Rich text
            </button>
            <button
              type="button"
              aria-pressed={mode === "markdown"}
              onClick={() => {
                if (mode === "rich") {
                  setForm((f) => ({ ...f, body: editor?.getHTML() ?? f.body }));
                  setMode("markdown");
                }
              }}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", mode === "markdown" ? "bg-navy-700 text-cream-100" : "text-navy-400")}
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden /> Markdown / HTML
            </button>
          </div>
        </div>

        {mode === "rich" ? (
          <div>
            <div className="flex gap-1 rounded-t-xl border border-navy-700 bg-navy-900 p-1.5" role="toolbar" aria-label="Formatting">
              {toolbarBtn("Bold", Bold, () => editor?.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
              {toolbarBtn("Italic", Italic, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
              {toolbarBtn("Heading 2", Heading2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 }))}
              {toolbarBtn("Heading 3", Heading3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), editor?.isActive("heading", { level: 3 }))}
              {toolbarBtn("Bullet list", List, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
              {toolbarBtn("Numbered list", ListOrdered, () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive("orderedList"))}
              {toolbarBtn("Quote", Quote, () => editor?.chain().focus().toggleBlockquote().run(), editor?.isActive("blockquote"))}
            </div>
            <EditorContent editor={editor} />
          </div>
        ) : (
          <textarea
            aria-label="Markdown body"
            rows={18}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={cn(inputCls, "font-mono text-xs leading-relaxed")}
            placeholder={"## Heading\n\nWrite markdown here…"}
          />
        )}
      </div>

      {/* SEO */}
      <fieldset className="rounded-2xl border border-navy-800 p-5">
        <legend className="px-2 text-sm font-semibold text-navy-200">SEO</legend>
        <div className="grid gap-4">
          <div>
            <label className={labelCls} htmlFor="bp-seotitle">
              SEO title <span className="font-normal text-navy-500">({form.seoTitle.length}/70)</span>
            </label>
            <input id="bp-seotitle" maxLength={70} value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="bp-seodesc">
              Meta description <span className="font-normal text-navy-500">({form.seoDesc.length}/160)</span>
            </label>
            <textarea id="bp-seodesc" maxLength={160} rows={2} value={form.seoDesc} onChange={(e) => setForm({ ...form, seoDesc: e.target.value })} className={inputCls} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <select
          aria-label="Post status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="h-11 rounded-xl border border-navy-700 bg-navy-950 px-3 text-sm text-navy-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center gap-2 rounded-xl bg-accent-500 px-6 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : saved ? <Check className="h-4 w-4" aria-hidden /> : null}
          {saved ? "Saved" : "Save post"}
        </button>
      </div>
    </form>
  );
}
