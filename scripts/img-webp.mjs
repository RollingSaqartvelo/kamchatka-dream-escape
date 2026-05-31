// Convert all room JPGs to WebP (q78, cap longest side 1280, no upscale).
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.jpe?g$/i.test(e)) out.push(p);
  }
  return out;
}

const files = walk("public/rooms");
let before = 0, after = 0;
for (const f of files) {
  before += statSync(f).size;
  const out = f.replace(/\.jpe?g$/i, ".webp");
  await sharp(f)
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(out);
  after += statSync(out).size;
}
console.log(`${files.length} files: ${(before/1048576).toFixed(2)}MB JPG -> ${(after/1048576).toFixed(2)}MB WebP (${Math.round((1-after/before)*100)}% smaller)`);
