import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

/** 丸型 RY アイコン（黒地・白文字） */
function iconSvg(size, opts = {}) {
  const pad = opts.pad || 0;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const fontSize = Math.round(inner * 0.34);
  const textY = cy + fontSize * 0.34;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#111111"/>
  <text x="${cx}" y="${textY}" text-anchor="middle"
    font-family="Arial Black, Helvetica, Arial, sans-serif" font-weight="900"
    font-size="${fontSize}" letter-spacing="${Math.round(fontSize * -0.04)}"
    fill="#ffffff">RY</text>
</svg>`;
}

async function writePng(name, svg, size) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("wrote", name);
}

await writePng("icon-192.png", iconSvg(192), 192);
await writePng("icon-512.png", iconSvg(512), 512);
await writePng("icon-180.png", iconSvg(180), 180);
await writePng(
  "icon-maskable-512.png",
  iconSvg(512, { pad: Math.round(512 * 0.1) }),
  512
);

await sharp(Buffer.from(iconSvg(180)))
  .resize(180, 180)
  .png()
  .toFile(join(process.cwd(), "public", "apple-touch-icon.png"));
console.log("wrote apple-touch-icon.png");
