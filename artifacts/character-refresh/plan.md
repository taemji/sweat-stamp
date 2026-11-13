# Character Refresh Plan

Spec: `artifacts/character-refresh/spec.md`

## Task 1. Image assets
- `scripts/build-character-assets.mjs` converts the source PNGs from `../sweat-stamp-img` (override with `CHARACTER_IMAGE_DIR`) with `sharp`:
  - `public/characters/<id>-portrait.webp` 600x800
  - `public/characters/<id>-avatar.webp` 192x192 face crop
  - `public/characters/<id>-workout.webp` 1080x1080
  - `app/icon.png` 512, `app/apple-icon.png` 180, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png` (padded on the cream background)
  - `app/opengraph-image.png` 1200x630 from `app_explanation.png`
- Remove `app/icon.svg`.

## Task 2. Member profiles (SC 1-3)
- `lib/member-profiles.ts`: replace `character` with `portrait`, `avatar`, and `workoutImage`; add `mainWorkout` and `subWorkout`; update the colors.
- `lib/member-profiles.test.ts`: assert workouts, distinct visuals, white-text contrast, and that the files exist.

## Task 3. Default workout photo
- `lib/default-workout-photo.ts`: `loadDefaultWorkoutPhoto(member)` fetches `workoutImage` and returns a `File` for `createStampedPhoto`.

## Task 4. UI (SC 4-6)
- `components/sweat-stamp-app.tsx`:
  - The character image in the stage, avatars in tabs and summary rows.
  - Routine prefill and main/sub chips.
  - An optional photo with the default illustration preview; `certifyToday` stamps the default image when no photo is selected.
- `app/globals.css`: remove the shape-character CSS and add the portrait, avatar, chip, and default-photo styles.
- `e2e/smoke.spec.ts`: update for the prefill, chip, and no-photo certification.

## Task 5. Manifest and icons (SC 7)
- `app/manifest.ts`: PNG icons and the cream background.
- `README.md`: list the asset script.
