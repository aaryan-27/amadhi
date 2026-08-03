import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getBlogPost, getBlogPosts } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { PRODUCTS, CITIES } from "@/lib/site";
import { Section, Breadcrumbs, Badge } from "@/components/ui/primitives";
import { JsonLd, breadcrumbLd, articleLd } from "@/components/seo/jsonld";

export const revalidate = 300;

type Params = Promise<{ category: string; slug: string }>;

export async function generateStaticParams() {
  const posts = await db.blogPost.findMany({
    where: { status: "published" },
    select: { slug: true, category: { select: { slug: true } } },
  });
  return posts.map((p) => ({ category: p.category.slug, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || post.status !== "published") return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt,
    alternates: { canonical: `/blog/${post.category.slug}/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDesc || post.excerpt,
      images: post.coverImage ? [{ url: post.coverImage }] : [],
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { category, slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || post.status !== "published" || post.category.slug !== category) notFound();

  const { html, toc } = renderMarkdown(post.body);
  const allPosts = await getBlogPosts();
  const related = allPosts
    .filter((p) => p.id !== post.id && (p.categoryId === post.categoryId ||
      p.tags.some((t) => post.tags.some((pt) => pt.tagId === t.tagId))))
    .slice(0, 3);

  // "Find {product} in {city}" module driven by tags
  const tagSlugs = post.tags.map((t) => t.tag.slug);
  const taggedProducts = PRODUCTS.filter((p) => tagSlugs.includes(p.slug));
  const taggedCities = CITIES.filter((c) => tagSlugs.includes(c.slug));
  const findLinks =
    (taggedProducts.length ? taggedProducts : PRODUCTS.slice(0, 2)).flatMap((p) =>
      (taggedCities.length ? taggedCities : CITIES).map((c) => ({
        label: `${p.plural} in ${c.name}`,
        href: `/${p.slug}/${c.slug}`,
      }))
    ).slice(0, 6);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: post.category.name, href: `/blog/${post.category.slug}` },
    { name: post.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          articleLd({
            title: post.title,
            description: post.excerpt,
            url: `/blog/${post.category.slug}/${post.slug}`,
            image: post.coverImage || undefined,
            datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
            dateModified: post.updatedAt.toISOString(),
            authorName: post.author.name,
          }),
        ]}
      />
      <Section className="py-10">
        <Breadcrumbs items={crumbs.slice(0, 3)} className="mb-6" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article>
            <Badge tone="cream">{post.category.name}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              {post.author.avatar && (
                <Image src={post.author.avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
              )}
              <div className="text-sm">
                <Link href={`/blog/author/${post.author.slug}`} className="font-semibold text-navy-950 hover:text-accent-600">
                  {post.author.name}
                </Link>
                <p className="text-muted">
                  {post.publishedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {post.readMins} min read
                </p>
              </div>
            </div>
            {post.coverImage && (
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
                <Image src={post.coverImage} alt="" fill priority sizes="(max-width: 1024px) 100vw, 720px" className="object-cover" />
              </div>
            )}
            <div className="prose-amadhi mt-8" dangerouslySetInnerHTML={{ __html: html }} />
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            {toc.length > 1 && (
              <nav aria-label="Table of contents" className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
                <ul className="space-y-2 text-sm">
                  {toc.map((entry) => (
                    <li key={entry.id} className={entry.depth === 3 ? "pl-3" : ""}>
                      <a href={`#${entry.id}`} className="text-navy-800 hover:text-accent-600">
                        {entry.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="rounded-2xl bg-navy-950 p-5 text-cream-100">
              <p className="font-display text-base font-semibold">Find your workspace</p>
              <ul className="mt-3 space-y-2 text-sm">
                {findLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-navy-200 underline-offset-2 hover:text-cream-100 hover:underline">
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-semibold text-navy-950">Related reads</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.category.slug}/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop"
                >
                  <div className="relative aspect-[16/10] bg-navy-100">
                    {p.coverImage && <Image src={p.coverImage} alt="" fill sizes="33vw" className="object-cover" />}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base font-semibold leading-snug text-navy-950 group-hover:text-accent-600">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted">{p.readMins} min read</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
