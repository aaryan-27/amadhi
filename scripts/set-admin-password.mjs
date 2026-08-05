#!/usr/bin/env node
/**
 * Change an admin account's password on whichever database DATABASE_URL points at.
 *
 * The repo ships prisma/dev.db with seeded admin accounts, so those password
 * hashes are public. Anything migrated from that snapshot inherits them — run
 * this once against production before going live.
 *
 *   DATABASE_URL="postgres://…" node scripts/set-admin-password.mjs \
 *     --email=admin@amadhi.com --password='your-new-password'
 *
 * Omit --password and one is generated for you and printed once.
 */
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(path.join(PROJECT, "package.json"));

const args = process.argv.slice(2);
const arg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const email = arg("email");
// DIRECT_URL first: schema/data work should bypass a connection pooler.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!email || !url) {
  console.error(`
✖ Usage:
  DATABASE_URL="postgres://…" node scripts/set-admin-password.mjs --email=admin@amadhi.com [--password='…']
`);
  process.exit(1);
}

// base64url avoids shell-quoting traps in a generated password.
const password = arg("password") || randomBytes(12).toString("base64url");
const generated = !arg("password");

if (password.length < 10) {
  console.error("✖ Password must be at least 10 characters.");
  process.exit(1);
}

const bcrypt = require_("bcryptjs");
const { PrismaClient } = await import(path.join(PROJECT, "node_modules/@prisma/client/default.js"));
const db = new PrismaClient({ datasourceUrl: url });

try {
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user) {
    const all = await db.adminUser.findMany({ select: { email: true } });
    console.error(`✖ No admin user "${email}".\n  Existing: ${all.map((u) => u.email).join(", ") || "(none)"}`);
    process.exit(1);
  }

  await db.adminUser.update({
    where: { email },
    data: { passwordHash: bcrypt.hashSync(password, 12) },
  });

  console.log(`\n✅ Password updated for ${email}`);
  if (generated) console.log(`\n   ${password}\n\n   Save it now — it is not stored anywhere and cannot be shown again.`);
} finally {
  await db.$disconnect();
}
