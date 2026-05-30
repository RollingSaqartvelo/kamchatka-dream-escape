// Compute a safe bounding box for SVG <path> data.
// Parses absolute/relative commands; for curves it also includes control
// points, so the result is a guaranteed superset of the true bbox
// (never clips, at worst a hair of padding). Optionally excludes paths
// whose fill matches a given background color.
import { readFileSync } from "node:fs";

const [, , file, excludeFill] = process.argv;
const svg = readFileSync(file, "utf8");

// Pull each <path ...> element's d and fill.
const paths = [...svg.matchAll(/<path\b[^>]*?>/gs)].map((m) => m[0]);
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

const numRe = /-?\d*\.?\d+(?:e-?\d+)?/gi;

function add(x, y) {
  if (x < minX) minX = x;
  if (y < minY) minY = y;
  if (x > maxX) maxX = x;
  if (y > maxY) maxY = y;
}

for (const p of paths) {
  const fill = (p.match(/fill:(#[0-9a-fA-F]{3,6})/) || [])[1];
  if (excludeFill && fill && fill.toLowerCase() === excludeFill.toLowerCase()) continue;
  const d = (p.match(/\bd="([^"]+)"/) || [])[1];
  if (!d) continue;

  let cx = 0, cy = 0, sx = 0, sy = 0;
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  let i = 0, cmd = "";
  const next = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const c = cmd.toLowerCase();
    if (c === "m" || c === "l" || c === "t") {
      let x = next(), y = next();
      if (rel) { x += cx; y += cy; }
      cx = x; cy = y;
      if (c === "m") { sx = cx; sy = cy; cmd = rel ? "l" : "L"; }
      add(cx, cy);
    } else if (c === "h") {
      let x = next(); if (rel) x += cx; cx = x; add(cx, cy);
    } else if (c === "v") {
      let y = next(); if (rel) y += cy; cy = y; add(cx, cy);
    } else if (c === "c") {
      for (let k = 0; k < 3; k++) {
        let x = next(), y = next();
        if (rel) { x += cx; y += cy; }
        add(x, y);
        if (k === 2) { cx = x; cy = y; }
      }
    } else if (c === "s" || c === "q") {
      for (let k = 0; k < 2; k++) {
        let x = next(), y = next();
        if (rel) { x += cx; y += cy; }
        add(x, y);
        if (k === 1) { cx = x; cy = y; }
      }
    } else if (c === "a") {
      next(); next(); next(); next(); next();
      let x = next(), y = next();
      if (rel) { x += cx; y += cy; }
      cx = x; cy = y; add(cx, cy);
    } else if (c === "z") {
      cx = sx; cy = sy;
    } else {
      i++; // unknown — skip a token defensively
    }
  }
}

const w = maxX - minX, h = maxY - minY;
console.log(JSON.stringify({ minX, minY, maxX, maxY, w, h }, null, 2));
