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
};

export default nextConfig;
