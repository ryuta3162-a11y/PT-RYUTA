import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

function svg(size) {
  const fontSize = Math.round(size * 0.34);
  const textY = size / 2 + fontSize * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#111111"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle"
    font-family="Arial Black, Helvetica, Arial, sans-serif" font-weight="900"
    font-size="${fontSize}" fill="#ffffff">WL</text>
</svg>`;
}

// Next.js app/favicon.ico — write as PNG-compatible ICO via sharp png then rename,
// plus app/icon.png which Next App Router picks up automatically.
const png32 = await sharp(Buffer.from(svg(32))).png().toBuffer();
const png48 = await sharp(Buffer.from(svg(48))).png().toBuffer();
const png180 = await sharp(Buffer.from(svg(180))).png().toBuffer();

writeFileSync(join(root, "app", "icon.png"), await sharp(Buffer.from(svg(512))).png().toBuffer());
writeFileSync(join(root, "app", "apple-icon.png"), png180);

// Prefer copying from public WL icon for consistency
const src = join(root, "public", "icons", "icon-192.png");
await sharp(src).resize(32, 32).png().toFile(join(root, "app", "favicon.ico"));
await sharp(src).resize(32, 32).png().toFile(join(root, "public", "favicon.ico"));

console.log("favicon + app icons updated to WL");
console.log("favicon bytes", readFileSync(join(root, "app", "favicon.ico")).length);
