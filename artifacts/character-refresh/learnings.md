# Character Refresh Learnings

- Source illustrations are 2-3 MB PNGs. Keep the originals outside the repo and commit only the resized WebP and PNG outputs from `scripts/build-character-assets.mjs`.
- Portrait backgrounds are close to, but not exactly, each member's `accentSoft`. A left and top `mask-image` fade hides the edge of the image inside the member stage.
- Stamped photos put the stamp band at the bottom, so any cropped preview of a stamped photo should anchor to `center bottom`.
- The certify button is enabled as soon as shared storage is ready, because one tap both marks the workout done and stamps it. E2E tests find it by its `도장 찍기` label, which includes the selected workout.
- In jsdom, `new Response(new Blob(..., { type }))` does not keep the blob type. Set a `Content-Type` header when stubbing `fetch` for image responses.
- English display text uses Fredoka through `next/font` (`--font-fredoka`, Tailwind `font-display`). Canvas stamps read the same variable at runtime and wait on `document.fonts.load` before drawing, because canvas does not inherit page fonts.
- The legacy id migration E2E read storage right after reload and raced the migration. Poll for the migrated value before asserting.
- On this Windows checkout the Next dev server sometimes keeps serving an old `globals.css` after scripted edits, and touching the file does not help. If a style change does not show up, compare the served CSS with the file on disk, then stop the server, delete `.next`, and start it again.
- The dev image optimizer once left a request for one avatar hanging forever, so the page `load` event never fired and every E2E test timed out. Character images are already pre-sized WebP, so `images.unoptimized` is on in `next.config.ts`.
- Shared-storage sync runs one pass at a time (a request during a pass schedules one more). Each pass loads with a 10-second timeout, shows server data first, then uploads device stamps marked `pendingUpload`. When the same member and day exist on both, the earlier `completedAt` wins.
- Subscribe to realtime once per page, not per sync status. Unsubscribing on the first failure left the app offline until a reload.
- To check the offline path locally, run a dev server with `NEXT_PUBLIC_SUPABASE_URL` pointing at a closed port (for example `http://127.0.0.1:9`). Stop the regular dev server first, because two `next dev` processes cannot share `.next`.
- A custom workout that matches a preset name needs its own "custom" flag (`custom` in the daily routines record); inferring it from the text loses the user's choice.
