#!/usr/bin/env node
/**
 * Build small "brand marks" from the partner logo tiles.
 *
 * The tiles in public/partners are 360×180 with a baked-in background and a lot
 * of padding — fine for the homepage wall, illegible when shrunk to a 20px card
 * badge. This trims each tile to its content (keeping its own background, so
 * white-on-navy logos stay readable) and writes public/partners/mark-<name>.png.
 *
 *   node scripts/make-operator-marks.mjs
 */
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(PROJECT, "public", "partners");
const sharp = createRequire(path.join(PROJECT, "package.json"))("sharp");

const files = readdirSync(DIR).filter((f) => f.endsWith(".png") && !f.startsWith("mark-"));
console.log(`trimming ${files.length} logo tiles…\n`);

for (const file of files) {
  const src = path.join(DIR, file);
  const out = path.join(DIR, `mark-${file}`);
  const before = await sharp(src).metadata();
  await sharp(src)
    // trim the uniform border away, whatever colour it is
    .trim({ threshold: 12 })
    // pad slightly so glyphs don't touch the rounded corners
    .extend({ top: 6, bottom: 6, left: 10, right: 10, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ height: 64, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const after = await sharp(out).metadata();
  console.log(`  ${file.padEnd(20)} ${before.width}×${before.height} → ${after.width}×${after.height}  mark-${file}`);
}
console.log("\ndone");
