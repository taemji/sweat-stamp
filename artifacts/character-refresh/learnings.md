# Character Refresh Learnings

- Source illustrations are 2-3 MB PNGs. Keep the originals outside the repo and commit only the resized WebP and PNG outputs from `scripts/build-character-assets.mjs`.
- Portrait backgrounds are close to, but not exactly, each member's `accentSoft`. A left and top `mask-image` fade hides the edge of the image inside the member stage.
- Stamped photos put the stamp band at the bottom, so any cropped preview of a stamped photo should anchor to `center bottom`.
- With the routine prefilled, `오늘 인증 남기기` depends only on the `운동 완료` toggle. E2E tests that check the disabled state must check it before toggling, not before filling the routine.
- In jsdom, `new Response(new Blob(..., { type }))` does not keep the blob type. Set a `Content-Type` header when stubbing `fetch` for image responses.
- English display text uses Fredoka through `next/font` (`--font-fredoka`, Tailwind `font-display`). Canvas stamps read the same variable at runtime and wait on `document.fonts.load` before drawing, because canvas does not inherit page fonts.
- The legacy id migration E2E read storage right after reload and raced the migration. Poll for the migrated value before asserting.
- On this Windows checkout the Next dev server sometimes keeps serving an old `globals.css` after scripted edits, and touching the file does not help. If a style change does not show up, compare the served CSS with the file on disk, then stop the server, delete `.next`, and start it again.
- The dev image optimizer once left a request for one avatar hanging forever, so the page `load` event never fired and every E2E test timed out. Character images are already pre-sized WebP, so `images.unoptimized` is on in `next.config.ts`.
