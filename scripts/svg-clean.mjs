// Emit a clean, web-ready SVG: keep only the real logo <path>s (optionally
// dropping a background-colored path), drop Inkscape/sodipodi cruft, and set a
// tight viewBox. Usage: node svg-clean.mjs <in> <out> <viewBox> [excludeFill]
import { readFileSync, writeFileSync } from "node:fs";

const [, , inFile, outFile, viewBox, excludeFill] = process.argv;
const svg = readFileSync(inFile, "utf8");

const paths = [...svg.matchAll(/<path\b[^>]*?\/>/gs)].map((m) => m[0]);
const kept = [];
for (const p of paths) {
  const fill = (p.match(/fill:(#[0-9a-fA-F]{3,6})/) || [])[1];
  if (excludeFill && fill && fill.toLowerCase() === excludeFill.toLowerCase()) continue;
  const d = (p.match(/\bd="([^"]+)"/) || [])[1];
  if (!d) continue;
  const style = (p.match(/\bstyle="([^"]+)"/) || [])[1] || "";
  // Keep only fill + fill-rule; drop stroke/id/inkscape noise.
  const fillVal = (style.match(/fill:(#[0-9a-fA-F]{3,6})/) || [])[1] || "#000000";
  const evenOdd = /fill-rule:evenodd/.test(style);
  kept.push(
    `  <path d="${d}" fill="${fillVal}"${evenOdd ? ' fill-rule="evenodd"' : ""}/>`,
  );
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
${kept.join("\n")}
</svg>
`;
writeFileSync(outFile, out);
console.log(`${outFile}: ${kept.length} paths, viewBox="${viewBox}"`);
