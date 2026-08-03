import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getBlogPosts, getBlogCategories } from "@/lib/queries";
import { Section, SectionHeading, Badge } from "@/components/ui/primitives";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — Workspace Guides, Pricing Reports & NCR Market Insights",
  description:
    "Practical guides on coworking, managed offices, office leasing and virtual offices across Gurugram, Noida and Delhi.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([getBlogPosts(), getBlogCategories()]);
  const [featured, ...rest] = posts;

  return (
    <Section className="py-12">
      <SectionHeading
        eyebrow="The Amadhi Blog"
        title="Workspace intelligence for Delhi NCR"
        sub="Pricing breakdowns, leasing playbooks and micro-market reports — written by people who place teams into NCR offices every day."
      />

      <nav aria-label="Blog categories" className="mb-10 flex flex-wrap gap-2">
        {categories
          .filter((c) => c._count.posts > 0)
          .map((c) => (
            <Link
              key={c.id}
              href={`/blog/${c.slug}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-navy-950 hover:bg-navy-950 hover:text-cream-100"
            >
              {c.name} ({c._count.posts})
            </Link>
          ))}
      </nav>

      {featured && (
        <Link
          href={`/blog/${featured.category.slug}/${featured.slug}`}
          className="group mb-10 grid overflow-hidden rounded-3xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop md:grid-cols-2"
        >
          <div className="relative aspect-[16/10] md:aspect-auto">
            {featured.coverImage && (
              <Image src={featured.coverImage} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            )}
          </div>
          <div className="flex flex-col justify-center p-8">
            <Badge tone="cream" className="w-fit">{featured.category.name}</Badge>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-navy-950 group-hover:text-accent-600">
              {featured.title}
            </h2>
            <p className="mt-3 line-clamp-3 text-muted">{featured.excerpt}</p>
            <p className="mt-4 text-sm text-muted">
              {featured.author.name} · {featured.readMins} min read
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.category.slug}/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop"
          >
            <div className="relative aspect-[16/10] bg-navy-100">
              {post.coverImage && (
                <Image src={post.coverImage} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <Badge tone="cream" className="w-fit">{post.category.name}</Badge>
              <h2 className="mt-2.5 font-display text-lg font-semibold leading-snug text-navy-950 group-hover:text-accent-600">
                {post.title}
              </h2>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{post.excerpt}</p>
              <p className="mt-4 text-xs text-muted">
                {post.author.name} · {post.readMins} min read
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
