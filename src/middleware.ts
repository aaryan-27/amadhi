import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Guard /admin behind an Auth.js session cookie. Full session validation
 * happens server-side in the admin layout; this is the fast first gate.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionCookie =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");
    if (!sessionCookie) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
