import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(process.env.CHARACTER_IMAGE_DIR ?? path.join(rootDir, "..", "sweat-stamp-img"));
const charactersDir = path.join(rootDir, "public", "characters");
const iconsDir = path.join(rootDir, "public", "icons");
const appDir = path.join(rootDir, "app");
// Matches TEAM_THEME.accentSoft in lib/member-profiles.ts and the team_lineup.png backdrop.
const creamBackground = "#fef1ca";

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

// Each member's pose in team_lineup.png, as [left, top, width, height] in source pixels.
const lineupBoxes = {
  taem: [77, 26, 494, 621],
  sam: [564, 171, 595, 466],
  sook: [1167, 61, 428, 575],
  yoom: [1688, 54, 371, 577],
};

// The cream backdrop of team_lineup.png. Backdrop pixels connected to the crop edge become
// transparent so a waiting member can be dimmed without showing a box around the character;
// light fur inside a character is not connected to the edge and stays opaque.
const lineupBackdrop = [254, 241, 202];
const backdropFullyClear = 3;
const backdropEdge = 11;

function knockOutBackdrop(data, width, height, channels) {
  const distanceAt = (pixel) => {
    const index = pixel * channels;
    return Math.max(
      Math.abs(data[index] - lineupBackdrop[0]),
      Math.abs(data[index + 1] - lineupBackdrop[1]),
      Math.abs(data[index + 2] - lineupBackdrop[2]),
    );
  };
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x += 1) {
    queue.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    queue.push(y * width, y * width + width - 1);
  }

  while (queue.length > 0) {
    const pixel = queue.pop();

    if (visited[pixel]) {
      continue;
    }
    visited[pixel] = 1;

    const distance = distanceAt(pixel);
    if (distance > backdropEdge) {
      continue;
    }

    const clearness = (distance - backdropFullyClear) / (backdropEdge - backdropFullyClear);
    data[pixel * channels + 3] = Math.round(Math.min(1, Math.max(0, clearness)) * 255);

    const x = pixel % width;
    if (x > 0) queue.push(pixel - 1);
    if (x < width - 1) queue.push(pixel + 1);
    if (pixel >= width) queue.push(pixel - width);
    if (pixel < width * (height - 1)) queue.push(pixel + width);
  }
}

async function buildLineupImages() {
  const lineup = await readSource("team_lineup.png");

  await Promise.all(Object.entries(lineupBoxes).map(async ([id, [left, top, width, height]]) => {
    const { data, info } = await sharp(lineup)
      .extract({ left, top, width, height })
      .resize({ width: Math.round(width / 2) })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    knockOutBackdrop(data, info.width, info.height, info.channels);

    await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .webp({ quality: 85, alphaQuality: 90 })
      .toFile(path.join(charactersDir, `${id}-lineup.webp`));
  }));
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
await buildLineupImages();
await buildOpenGraphImage();

console.log(`Character assets built from ${sourceDir}`);
