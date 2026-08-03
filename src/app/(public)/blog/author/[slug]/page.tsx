import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getAuthor } from "@/lib/queries";
import { Section, Breadcrumbs, Badge } from "@/components/ui/primitives";
import { JsonLd, breadcrumbLd } from "@/components/seo/jsonld";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const authors = await db.author.findMany({ select: { slug: true } });
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.role} at Amadhi`,
    description: author.bio,
    alternates: { canonical: `/blog/author/${author.slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: author.name },
  ];

  return (
    <Section className="py-12">
      <JsonLd
        data={[
          breadcrumbLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: author.name,
            jobTitle: author.role,
            description: author.bio,
            url: `${SITE.domain}/blog/author/${author.slug}`,
            ...(author.linkedin ? { sameAs: [author.linkedin] } : {}),
            worksFor: { "@type": "Organization", name: SITE.name },
          },
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-8" />
      <div className="mb-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {author.avatar && (
          <Image src={author.avatar} alt={author.name} width={112} height={112} className="h-28 w-28 rounded-2xl object-cover" />
        )}
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-950">{author.name}</h1>
          <p className="mt-1 text-accent-600">{author.role}</p>
          <p className="mt-3 max-w-2xl text-muted">{author.bio}</p>
          {author.linkedin && (
            <a
              href={author.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-900 hover:text-accent-600"
            >
              <ExternalLink className="h-4 w-4" aria-hidden /> LinkedIn profile
            </a>
          )}
        </div>
      </div>

      <h2 className="mb-6 font-display text-xl font-semibold text-navy-950">
        Articles by {author.name} ({author.posts.length})
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {author.posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.category.slug}/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-pop"
          >
            <div className="relative aspect-[16/10] bg-navy-100">
              {post.coverImage && <Image src={post.coverImage} alt="" fill sizes="33vw" className="object-cover" />}
            </div>
            <div className="p-5">
              <Badge tone="cream">{post.category.name}</Badge>
              <h3 className="mt-2.5 font-display text-base font-semibold leading-snug text-navy-950 group-hover:text-accent-600">
                {post.title}
              </h3>
              <p className="mt-2 text-xs text-muted">{post.readMins} min read</p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
