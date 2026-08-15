/**
 * 経堂マシン写真（24KYODO-MACHINE）から RY-LOG 用 WebP を生成する。
 * Usage: node scripts/generate-machine-images.mjs [sourceDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir =
  process.argv[2] ||
  path.join(root, "..", "24KYODO-MACHINE");
const outDir = path.join(root, "public", "machines");

const MAP = {
  c_treadmill: "cardio_1.jpg",
  c_cross: "cardio_2.jpg",
  c_bike: "cardio_3.jpg",
  m_chest_press: "resistance_13.jpg",
  m_shoulder_press: "resistance_2.jpg",
  m_lat_pulldown: "resistance_4.jpg",
  m_row: "resistance_14.jpg",
  m_leg_press: "resistance_1.jpg",
  m_leg_ext: "resistance_8.jpg",
  m_leg_curl: "resistance_9.jpg",
  m_abdominal: "resistance_15.jpg",
  m_glute: "resistance_5.jpg",
  m_back_ext: "resistance_7.jpg",
  m_torso: "resistance_12.jpg",
  m_pec_fly: "resistance_3.jpg",
  m_rear_delt: "resistance_3.jpg",
  m_abduction: "resistance_10.jpg",
  m_adduction: "resistance_11.jpg",
  m_crunch: "resistance_6.jpg",
};

fs.mkdirSync(outDir, { recursive: true });

for (const [id, file] of Object.entries(MAP)) {
  const src = path.join(srcDir, file);
  if (!fs.existsSync(src)) {
    console.error("missing", src);
    process.exit(1);
  }
  const meta = await sharp(src).metadata();
  const w = meta.width || 1080;
  const h = meta.height || 1440;
  const cropH = Math.round(h * 0.86);
  const extracted = await sharp(src)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .toBuffer();
  await sharp(extracted)
    .resize(360, 480, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${id}.webp`));
  await sharp(extracted)
    .resize(120, 160, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 75 })
    .toFile(path.join(outDir, `${id}-sm.webp`));
  console.log(id);
}

console.log("wrote", Object.keys(MAP).length, "→", outDir);
