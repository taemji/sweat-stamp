import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(process.env.CHARACTER_IMAGE_DIR ?? path.join(rootDir, "..", "sweat-stamp-img"));
const charactersDir = path.join(rootDir, "public", "characters");
const iconsDir = path.join(rootDir, "public", "icons");
const appDir = path.join(rootDir, "app");
const creamBackground = "#fef2c9";

const members = [
  { id: "taem", portrait: "taem_id.png", workout: "taem_ballet.png" },
  { id: "sam", portrait: "sam_id.png", workout: "sam_pilates.png" },
  { id: "sook", portrait: "sook_id.png", workout: "sook_pilates.png" },
  { id: "yoom", portrait: "yoom_id.png", workout: "yoom_dance_workout.png" },
];

async function readSource(fileName) {
  return readFile(path.join(sourceDir, fileName));
}

async function buildMemberAssets(member) {
  const portrait = await readSource(member.portrait);
  const workout = await readSource(member.workout);
  const { width, height } = await sharp(portrait).metadata();
  const faceSize = Math.round(width * 0.78);

  await sharp(portrait)
    .resize(600, 800, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(charactersDir, `${member.id}-portrait.webp`));

  await sharp(portrait)
    .extract({
      left: Math.round((width - faceSize) / 2),
      top: Math.round(height * 0.2),
      width: faceSize,
      height: faceSize,
    })
    .resize(192, 192)
    .webp({ quality: 82 })
    .toFile(path.join(charactersDir, `${member.id}-avatar.webp`));

  await sharp(workout)
    .resize(1080, 1080, { fit: "cover" })
    .webp({ quality: 85 })
    .toFile(path.join(charactersDir, `${member.id}-workout.webp`));
}

async function buildIcons() {
  const icon = await readSource("app_icon.png");

  await sharp(icon).resize(512, 512).png({ palette: true, quality: 90 }).toFile(path.join(appDir, "icon.png"));
  await sharp(icon).resize(180, 180).png({ palette: true, quality: 90 }).toFile(path.join(appDir, "apple-icon.png"));
  await sharp(icon).resize(192, 192).png({ palette: true, quality: 90 }).toFile(path.join(iconsDir, "icon-192.png"));
  await sharp(icon).resize(512, 512).png({ palette: true, quality: 90 }).toFile(path.join(iconsDir, "icon-512.png"));

  const maskableContent = await sharp(icon).resize(410, 410).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: creamBackground } })
    .composite([{ input: maskableContent, gravity: "center" }])
    .png({ palette: true, quality: 90 })
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));
}

async function buildTeamImage() {
  await sharp(await readSource("app_explanation.png"))
    .resize(900, 900)
    .webp({ quality: 82 })
    .toFile(path.join(charactersDir, "team.webp"));
}

async function buildOpenGraphImage() {
  const explanation = await readSource("app_explanation.png");
  const content = await sharp(explanation).resize(630, 630).png().toBuffer();

  await sharp({ create: { width: 1200, height: 630, channels: 4, background: creamBackground } })
    .composite([{ input: content, gravity: "center" }])
    .png({ palette: true, quality: 90 })
    .toFile(path.join(appDir, "opengraph-image.png"));
}

await mkdir(charactersDir, { recursive: true });
await mkdir(iconsDir, { recursive: true });
await Promise.all(members.map(buildMemberAssets));
await buildIcons();
await buildTeamImage();
await buildOpenGraphImage();

console.log(`Character assets built from ${sourceDir}`);
