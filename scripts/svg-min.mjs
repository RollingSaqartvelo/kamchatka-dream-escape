import { readFileSync, writeFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  let s = readFileSync(f, "utf8");
  // round any number with >=2 decimals to 1 decimal (sub-pixel at logo size)
  s = s.replace(/-?\d+\.\d{2,}/g, (m) => String(Math.round(parseFloat(m) * 10) / 10));
  s = s.replace(/\n\s+/g, "\n").replace(/\n+/g, "\n");
  writeFileSync(f, s);
  const gz = (await import("node:zlib")).gzipSync(s).length;
  console.log(f, "→", Buffer.byteLength(s), "B raw,", gz, "B gzip");
}
