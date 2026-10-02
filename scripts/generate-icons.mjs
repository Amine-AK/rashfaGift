// Generates the PWA icons from the mascot line art.  Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const ink = "#3B2418";
const mascot = (steam = true) => `
  ${steam ? `<g fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" opacity=".7">
    <path d="M52 12c-4 4 4 6 0 10"/><path d="M60 8c-4 4 4 6 0 10"/><path d="M68 12c-4 4 4 6 0 10"/></g>` : ""}
  <circle cx="60" cy="58" r="34" fill="#fff" stroke="${ink}" stroke-width="3"/>
  <g fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"><path d="M42 54q6 6 12 0"/><path d="M66 54q6 6 12 0"/></g>
  <ellipse cx="40" cy="66" rx="5" ry="3" fill="#E58FA6" opacity=".55"/><ellipse cx="80" cy="66" rx="5" ry="3" fill="#E58FA6" opacity=".55"/>
  <path d="M54 68q6 5 12 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
  <path d="M33 84h54l-4 24a8 8 0 0 1-8 7H45a8 8 0 0 1-8-7z" fill="#F1DCC0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M87 89h3a7 7 0 0 1 0 14h-5" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="35" cy="99" r="5" fill="#fff" stroke="${ink}" stroke-width="2.5"/><circle cx="62" cy="86" r="5" fill="#fff" stroke="${ink}" stroke-width="2.5"/>`;

const tiles = ["#D9483B", "#1F4E9C", "#2F7D4F", "#E8B43A", "#2BA59B", "#E58FA6"];
// Square icon: cream background, a ring of zellige squares, the mascot in the middle.
function icon(size, { padding = 0.12, ring = true } = {}) {
  const n = 28;
  let rects = "";
  if (ring) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = 100 + 88 * Math.cos(a), y = 100 + 88 * Math.sin(a);
      rects += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="${tiles[i % tiles.length]}" transform="rotate(${(a * 180) / Math.PI} ${x} ${y})"/>`;
    }
  }
  const inner = 200 * (1 - padding * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#FBF6EE"/>${rects}
    <g transform="translate(${100 - inner / 2 + 6} ${100 - inner / 2 + 2}) scale(${inner / 124})">${mascot()}</g></svg>`;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/mascot.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 124">${mascot()}</svg>`);
const out = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["apple-touch-icon.png", 180, {}],
  // Maskable icons need a generous safe zone: no ring, more padding.
  ["maskable-512.png", 512, { padding: 0.22, ring: false }],
];
for (const [name, size, opts] of out) {
  await sharp(Buffer.from(icon(size, opts))).png().toFile(`public/icons/${name}`);
}
// Monochrome badge for Android's status bar.
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 120 124">${mascot(false).replaceAll("#F1DCC0", "none").replaceAll("#fff", "none").replaceAll("#E58FA6", "none").replaceAll(ink, "#fff")}</svg>`))
  .png().toFile("public/icons/badge-96.png");
await sharp(Buffer.from(icon(64))).png().toFile("app/icon.png");
console.log("icons written");
