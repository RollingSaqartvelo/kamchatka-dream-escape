// Parse a Google Fonts CSS2 response, download the latin+cyrillic woff2 subsets
// locally, and emit @font-face rules pointing at /fonts/*.woff2 (display:swap,
// unicode-range preserved so the browser only fetches the subset it needs).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const css = readFileSync("scripts/_gf.css", "utf8");
mkdirSync("public/fonts", { recursive: true });

const KEEP = new Set(["latin", "cyrillic"]);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
const faces = [];
let m;
while ((m = re.exec(css))) {
  const subset = m[1];
  if (!KEEP.has(subset)) continue;
  const body = m[2];
  const family = (body.match(/font-family:\s*'([^']+)'/) || [])[1];
  const style = (body.match(/font-style:\s*(\w+)/) || [])[1] || "normal";
  const weight = (body.match(/font-weight:\s*(\d+)/) || [])[1] || "400";
  const url = (body.match(/src:\s*url\(([^)]+)\)/) || [])[1];
  const range = (body.match(/unicode-range:\s*([^;]+);/) || [])[1];
  if (!family || !url) continue;
  const name = `${slug(family)}-${weight}${style === "italic" ? "-italic" : ""}-${subset}.woff2`;
  faces.push({ family, style, weight, url, range, name });
}

console.log(`Качаю ${faces.length} woff2…`);
let total = 0;
for (const f of faces) {
  const res = await fetch(f.url);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`public/fonts/${f.name}`, buf);
  total += buf.length;
}
console.log(`Готово: ${(total / 1024).toFixed(0)} KB в public/fonts/`);

const out = faces
  .map(
    (f) => `@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url('/fonts/${f.name}') format('woff2');
  unicode-range: ${f.range};
}`,
  )
  .join("\n");
writeFileSync("scripts/_fontface.css", out);
console.log("@font-face записан в scripts/_fontface.css");
