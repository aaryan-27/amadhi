import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { DeletePostButton } from "./delete-button";

export default async function AdminBlogPage() {
  const posts = await db.blogPost.findMany({
    include: { category: true, author: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream-100">Blog</h1>
          <p className="mt-1 text-sm text-navy-300">{posts.length} posts</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus className="h-4 w-4" aria-hidden /> New post
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs uppercase tracking-wider text-navy-400">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {posts.map((post) => (
              <tr key={post.id} className="bg-navy-950/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/blog/${post.id}`} className="font-medium text-cream-100 hover:text-accent-400">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-navy-300">{post.category.name}</td>
                <td className="px-4 py-3 text-navy-300">{post.author.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      post.status === "published"
                        ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-400"
                        : "rounded-full bg-navy-800 px-2.5 py-1 text-xs capitalize text-navy-300"
                    }
                  >
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-navy-400">
                  {post.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {post.status === "published" && (
                      <a
                        href={`/blog/${post.category.slug}/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-navy-300 hover:text-cream-100"
                      >
                        View <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                    <DeletePostButton postId={post.id} title={post.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
