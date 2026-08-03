import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BlogEditor } from "./blog-editor";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const [post, categories, authors] = await Promise.all([
    isNew ? null : db.blogPost.findUnique({ where: { id } }),
    db.blogCategory.findMany({ orderBy: { name: "asc" } }),
    db.author.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!isNew && !post) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/blog" className="text-sm text-navy-300 hover:text-cream-100">← Back to blog</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream-100">
        {isNew ? "New post" : `Edit: ${post!.title}`}
      </h1>
      <div className="mt-6">
        <BlogEditor
          post={
            post
              ? {
                  id: post.id,
                  title: post.title,
                  slug: post.slug,
                  excerpt: post.excerpt,
                  body: post.body,
                  coverImage: post.coverImage,
                  categoryId: post.categoryId,
                  authorId: post.authorId,
                  seoTitle: post.seoTitle,
                  seoDesc: post.seoDesc,
                  status: post.status,
                }
              : null
          }
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          authors={authors.map((a) => ({ id: a.id, name: a.name }))}
        />
      </div>
    </div>
  );
}
