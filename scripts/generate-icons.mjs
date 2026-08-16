/**
 * 丸型アプリアイコン生成
 * WL = workout-log / WA = work-admin / PT = PT管理
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

function iconSvg(size, letters, opts = {}) {
  const pad = opts.pad || 0;
  const fill = opts.fill || "#111111";
  const ring = opts.ring || null;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const fontSize = Math.round(inner * (letters.length > 2 ? 0.28 : 0.34));
  const textY = cy + fontSize * 0.34;
  const ringEl = ring
    ? `<circle cx="${cx}" cy="${cy}" r="${r - size * 0.04}" fill="none" stroke="${ring}" stroke-width="${Math.max(2, size * 0.035)}"/>`
    : "";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
  ${ringEl}
  <text x="${cx}" y="${textY}" text-anchor="middle"
    font-family="Arial Black, Helvetica, Arial, sans-serif" font-weight="900"
    font-size="${fontSize}" letter-spacing="${Math.round(fontSize * -0.04)}"
    fill="#ffffff">${letters}</text>
</svg>`;
}

async function writePng(name, svg, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, name));
  console.log("wrote", name);
}

async function writeSet(prefix, letters, style, applePath) {
  await writePng(`${prefix}-192.png`, iconSvg(192, letters, style), 192);
  await writePng(`${prefix}-512.png`, iconSvg(512, letters, style), 512);
  await writePng(`${prefix}-180.png`, iconSvg(180, letters, style), 180);
  await writePng(
    `${prefix}-maskable-512.png`,
    iconSvg(512, letters, { ...style, pad: Math.round(512 * 0.1) }),
    512
  );
  await sharp(Buffer.from(iconSvg(180, letters, style)))
    .resize(180, 180)
    .png()
    .toFile(join(process.cwd(), "public", applePath));
}

// 会員 WL（黒）
await writeSet("icon", "WL", { fill: "#111111" }, "apple-touch-icon.png");
await sharp(Buffer.from(iconSvg(32, "WL")))
  .resize(32, 32)
  .png()
  .toFile(join(process.cwd(), "app", "favicon.ico"));
await sharp(Buffer.from(iconSvg(32, "WL")))
  .resize(32, 32)
  .png()
  .toFile(join(process.cwd(), "public", "favicon.ico"));
await sharp(Buffer.from(iconSvg(512, "WL")))
  .resize(512, 512)
  .png()
  .toFile(join(process.cwd(), "app", "icon.png"));
await sharp(Buffer.from(iconSvg(180, "WL")))
  .resize(180, 180)
  .png()
  .toFile(join(process.cwd(), "app", "apple-icon.png"));

// スタッフ WA（濃灰＋白リング）
await writeSet(
  "admin",
  "WA",
  { fill: "#222222", ring: "#ffffff" },
  "ops-apple-touch-icon.png"
);

// PT管理 PT（深い赤系で差別化）
await writeSet(
  "pta",
  "PT",
  { fill: "#8B0000" },
  "pta-apple-touch-icon.png"
);

console.log("WL / WA / PT icons ready");
