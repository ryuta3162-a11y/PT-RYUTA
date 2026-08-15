/**
 * フリーウェイト用アイコン（ソリッド・シルエット）
 * Usage: node scripts/generate-fw-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "machines");
fs.mkdirSync(outDir, { recursive: true });

function canvas(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
  <rect width="360" height="480" fill="#ffffff"/>
  <g fill="#111111" stroke="none">
    ${body}
  </g>
</svg>`;
}

const ICONS = {
  // ダンベル（正面）
  fw_dumbbell: canvas(`
    <rect x="138" y="228" width="84" height="24" rx="8"/>
    <rect x="78" y="198" width="54" height="84" rx="10"/>
    <rect x="228" y="198" width="54" height="84" rx="10"/>
    <rect x="58" y="212" width="24" height="56" rx="6"/>
    <rect x="278" y="212" width="24" height="56" rx="6"/>
  `),

  // バーベル（スクワット／床引き共通の基本バー）
  fw_squat: canvas(`
    <rect x="60" y="210" width="240" height="18" rx="9"/>
    <rect x="48" y="188" width="36" height="62" rx="8"/>
    <rect x="276" y="188" width="36" height="62" rx="8"/>
    <rect x="34" y="198" width="18" height="42" rx="5"/>
    <rect x="308" y="198" width="18" height="42" rx="5"/>
    <rect x="168" y="248" width="24" height="70" rx="8"/>
    <path d="M148 318 h64 l12 36 h-88 z"/>
  `),

  // デッドリフト（床のバー）
  fw_deadlift: canvas(`
    <rect x="50" y="292" width="260" height="18" rx="9"/>
    <circle cx="86" cy="301" r="38"/>
    <circle cx="274" cy="301" r="38"/>
    <circle cx="86" cy="301" r="18" fill="#ffffff"/>
    <circle cx="274" cy="301" r="18" fill="#ffffff"/>
    <rect x="168" y="210" width="24" height="82" rx="8"/>
    <path d="M145 210 h70 l10 28 h-90 z"/>
  `),

  // ベンチプレス
  fw_bench: canvas(`
    <rect x="70" y="168" width="220" height="16" rx="8"/>
    <rect x="56" y="148" width="32" height="56" rx="7"/>
    <rect x="272" y="148" width="32" height="56" rx="7"/>
    <rect x="100" y="250" width="160" height="28" rx="8"/>
    <rect x="118" y="278" width="18" height="54" rx="5"/>
    <rect x="224" y="278" width="18" height="54" rx="5"/>
    <rect x="110" y="328" width="140" height="12" rx="4"/>
  `),

  // オーバーヘッドプレス
  fw_ohp: canvas(`
    <rect x="70" y="118" width="220" height="16" rx="8"/>
    <rect x="56" y="98" width="32" height="56" rx="7"/>
    <rect x="272" y="98" width="32" height="56" rx="7"/>
    <rect x="168" y="150" width="24" height="120" rx="8"/>
    <path d="M145 270 h70 l14 40 h-98 z"/>
    <rect x="130" y="330" width="100" height="14" rx="5"/>
  `),

  // ケーブル
  fw_cable: canvas(`
    <rect x="96" y="120" width="52" height="220" rx="8"/>
    <rect x="108" y="136" width="28" height="12" rx="3"/>
    <rect x="108" y="156" width="28" height="12" rx="3"/>
    <rect x="108" y="176" width="28" height="12" rx="3"/>
    <rect x="108" y="196" width="28" height="12" rx="3"/>
    <rect x="108" y="216" width="28" height="12" rx="3"/>
    <rect x="108" y="236" width="28" height="12" rx="3"/>
    <rect x="118" y="100" width="120" height="14" rx="5"/>
    <rect x="224" y="100" width="14" height="90" rx="5"/>
    <rect x="198" y="186" width="66" height="14" rx="5"/>
    <circle cx="231" cy="230" r="22"/>
    <circle cx="231" cy="230" r="10" fill="#ffffff"/>
  `),

  // シーテッドロー
  fw_row: canvas(`
    <rect x="70" y="286" width="180" height="20" rx="8"/>
    <rect x="90" y="306" width="16" height="40" rx="4"/>
    <rect x="214" y="306" width="16" height="40" rx="4"/>
    <rect x="250" y="170" width="40" height="160" rx="8"/>
    <rect x="262" y="186" width="16" height="12" rx="2"/>
    <rect x="262" y="206" width="16" height="12" rx="2"/>
    <rect x="262" y="226" width="16" height="12" rx="2"/>
    <rect x="140" y="210" width="110" height="14" rx="5"/>
    <rect x="140" y="210" width="14" height="50" rx="5"/>
    <rect x="236" y="210" width="14" height="50" rx="5"/>
  `),

  // スミス（ガイド付きバー）
  fw_smith: canvas(`
    <rect x="110" y="100" width="18" height="280" rx="6"/>
    <rect x="232" y="100" width="18" height="280" rx="6"/>
    <rect x="70" y="200" width="220" height="16" rx="8"/>
    <rect x="56" y="180" width="32" height="56" rx="7"/>
    <rect x="272" y="180" width="32" height="56" rx="7"/>
    <rect x="168" y="236" width="24" height="70" rx="8"/>
    <path d="M148 306 h64 l12 36 h-88 z"/>
  `),
};

async function writeIcon(id, svg) {
  const buf = Buffer.from(svg);
  await sharp(buf)
    .resize(360, 480)
    .webp({ quality: 92 })
    .toFile(path.join(outDir, `${id}.webp`));
  await sharp(buf)
    .resize(160, 214)
    .webp({ quality: 90 })
    .toFile(path.join(outDir, `${id}-sm.webp`));
  console.log(id);
}

for (const [id, svg] of Object.entries(ICONS)) {
  await writeIcon(id, svg);
}
console.log("wrote", Object.keys(ICONS).length, "fw icons");
