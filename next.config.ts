import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Only Amadhi's own Cloudinary account may serve listing imagery. Scoping the
// pathname (rather than allowing every res.cloudinary.com tenant) means a stray
// third-party URL can never silently render again.
const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME ?? "o2gthvvd";

// URLs left behind by the site that ran on amadhi.com before this one. Search
// engines still list some of them; a permanent redirect sends those visitors
// somewhere useful and lets the old page's ranking pass to the new one.
// 301 rather than Next's default 308 for `permanent: true` — both are
// permanent, but 301 is the one every crawler and SEO tool reads the same way.
const LEGACY_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/home-3", destination: "/" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: `/${CLOUDINARY_CLOUD}/**` },
      // Decorative marketing photography still referenced from source files.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // A trailing-slash form (/home-3/, how WordPress wrote its URLs) needs no
    // entry: Next strips the slash with its own permanent 308 before these
    // rules run, so it reaches the same 301 in two hops.
    return LEGACY_REDIRECTS.map((r) => ({ ...r, statusCode: 301 as const }));
  },
};

export default nextConfig;
