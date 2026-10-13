import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Guard /admin behind an Auth.js session cookie. Full session validation
 * happens server-side in the admin layout; this is the fast first gate.
 */
/**
 * Build a URL the visitor's browser can actually reach.
 *
 * Behind Nginx, `req.url` carries the internal origin the proxy connected to
 * (127.0.0.1:3000), so redirecting against it sends people to
 * https://localhost:3000 — a dead end on their machine. The public address
 * only exists in the forwarded headers, so take it from there, falling back to
 * Host and finally to the request itself for direct (unproxied) access.
 */
function publicUrl(req: NextRequest, path: string): URL {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    req.nextUrl.protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionCookie =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");
    if (!sessionCookie) {
      const url = publicUrl(req, "/admin/login");
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
