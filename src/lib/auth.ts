import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Admin-only authentication (Auth.js credentials provider).
 * The public site is 100% account-free — this guards /admin exclusively.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Safe here: the app sits behind our own Nginx/Cloudflare proxy which sets Host.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h sessions
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await db.adminUser.findUnique({
          where: { email },
          include: { role: true },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await db.activityLog.create({
          data: { userId: user.id, action: "login", entity: "auth" },
        });

        return { id: user.id, email: user.email, name: user.name, role: user.role.slug };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
});

/** RBAC helper: which role slugs may access which admin module. */
export const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: ["super_admin", "admin", "content_writer", "seo_executive", "sales_manager", "sales_executive", "viewer"],
  leads: ["super_admin", "admin", "sales_manager", "sales_executive"],
  listings: ["super_admin", "admin", "seo_executive"],
  blog: ["super_admin", "admin", "content_writer", "seo_executive"],
  reviews: ["super_admin", "admin", "sales_manager"],
  settings: ["super_admin"],
};

export function canAccess(role: string | undefined, module: keyof typeof MODULE_ACCESS) {
  if (!role) return false;
  return MODULE_ACCESS[module]?.includes(role) ?? false;
}
