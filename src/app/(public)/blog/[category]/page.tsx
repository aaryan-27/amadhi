import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getBlogPosts, getBlogCategories } from "@/lib/queries";
import { Section, SectionHeading, Badge, Breadcrumbs } from "@/components/ui/primitives";
import { JsonLd, breadcrumbLd } from "@/components/seo/jsonld";

export const revalidate = 300;

type Params = Promise<{ category: string }>;

export async function generateStaticParams() {
  const cats = await db.blogCategory.findMany({ select: { slug: true } });
  return cats.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const cat = await db.blogCategory.findUnique({ where: { slug: category } });
  if (!cat) return {};
  return {
    title: `${cat.name} Articles — Amadhi Blog`,
    description: `Guides and insights on ${cat.name.toLowerCase()} across Gurugram, Noida and Delhi.`,
    alternates: { canonical: `/blog/${cat.slug}` },
  };
}

export default async function BlogCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const [cat, posts, categories] = await Promise.all([
    db.blogCategory.findUnique({ where: { slug: category } }),
    getBlogPosts(category),
    getBlogCategories(),
  ]);
  if (!cat) notFound();

  const crumbs = [{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: cat.name }];

  return (
    <Section className="py-12">
      <JsonLd data={breadcrumbLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-6" />
      <SectionHeading eyebrow="Category" title={`${cat.name} articles`} />

      <nav aria-label="Blog categories" className="mb-10 flex flex-wrap gap-2">
        <Link href="/blog" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:border-navy-950">
          All
        </Link>
        {categories
          .filter((c) => c._count.posts > 0)
          .map((c) => (
            <Link
              key={c.id}
              href={`/blog/${c.slug}`}
              aria-current={c.slug === category ? "page" : undefined}
              className={
                c.slug === category
                  ? "rounded-full bg-navy-950 px-4 py-2 text-sm font-medium text-cream-100"
                  : "rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:border-navy-950"
              }
            >
              {c.name}
            </Link>
          ))}
      </nav>

      {posts.length === 0 ? (
        <p className="text-muted">No published articles in this category yet — check back soon.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
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
                <p className="mt-4 text-xs text-muted">{post.author.name} · {post.readMins} min read</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
