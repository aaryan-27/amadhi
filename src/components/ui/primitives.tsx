import Link from "next/link";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/* ─── Button ────────────────────────────────────────────────────────── */

const buttonStyles = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm",
  dark: "bg-navy-950 text-cream-100 hover:bg-navy-800",
  outline:
    "border border-navy-200 text-navy-900 hover:border-navy-400 hover:bg-navy-50",
  ghost: "text-navy-800 hover:bg-navy-50",
  cream: "bg-cream-200 text-navy-950 hover:bg-cream-300",
  whatsapp: "bg-[#128c4b] text-white hover:bg-[#0f7a41]",
} as const;

const buttonSizes = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
} as const;

export function buttonCls(
  variant: keyof typeof buttonStyles = "primary",
  size: keyof typeof buttonSizes = "md",
  extra?: string
) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors select-none whitespace-nowrap min-h-[44px]",
    size === "sm" && "min-h-[36px]",
    buttonStyles[variant],
    buttonSizes[size],
    extra
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonStyles;
  size?: keyof typeof buttonSizes;
}) {
  return <button className={buttonCls(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof buttonStyles;
  size?: keyof typeof buttonSizes;
  href: string;
}) {
  const cls = buttonCls(variant, size, className);
  if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:"))
    return <a href={href} className={cls} {...props} />;
  return <Link href={href} className={cls} {...props} />;
}

/* ─── Badge ─────────────────────────────────────────────────────────── */

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "verified" | "featured" | "trending" | "cream";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-navy-50 text-navy-700",
        tone === "verified" && "bg-emerald-50 text-emerald-700",
        tone === "featured" && "bg-accent-50 text-accent-600",
        tone === "trending" && "bg-amber-50 text-amber-700",
        tone === "cream" && "bg-cream-100 text-navy-800",
        className
      )}
      {...props}
    />
  );
}

/* ─── Rating stars ──────────────────────────────────────────────────── */

export function RatingStars({ rating, count, className }: { rating: number; count?: number; className?: string }) {
  if (!rating) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-semibold text-navy-900">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}

/* ─── Section shell ─────────────────────────────────────────────────── */

export function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-600">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-semibold text-navy-950 sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-navy-100", className)} />;
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/* ─── Breadcrumbs (UI; schema emitted separately) ───────────────────── */

export function Breadcrumbs({ items, className }: { items: { name: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-navy-900 hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-navy-900">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-wash p-10 text-center">
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>}
      {children && <div className="mt-5 flex justify-center gap-3">{children}</div>}
    </div>
  );
}
