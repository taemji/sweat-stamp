# AGENTS.md

## Scope

These instructions apply to the entire repository. Project-specific instructions here take precedence over global agent defaults.

## Project Snapshot

This is a mobile-first Sweat Stamp photo certification app built with Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui, Radix/Base UI, Lucide icons, IndexedDB, Vitest, Testing Library, and Playwright. The package manager is Bun.

`README.md` is the user-facing project overview. The current product is a Korean-language workout certification app for taem, saem, yum, and ssuk. Each member has an independent theme, character, routine, photo, and daily completion state.

## Start Here

- Read `CLAUDE.md` before significant work. It defines the spec-driven workflow, testing expectations, package manager, commit convention, and dependency direction.
- Check `git status --short` before editing. Preserve user changes and ignore unrelated dirty files.
- Use `rg` / `rg --files` for repository search.
- Use Bun commands from `package.json`; do not introduce another package manager or replace `bun.lock`.
- For third-party library, framework, SDK, CLI, or config changes, resolve the pinned version from `package.json`/`bun.lock` first and consult Context7 before writing code.

## Product And UX Conventions

- User-facing UI copy is Korean and should stay natural Korean unless a task explicitly changes language.
- The app is designed for a narrow mobile viewport (`max-w-[430px]`) with a native-app feel. Verify mobile layout carefully when touching UI.
- Follow the existing visual system in `app/globals.css`: member theme tokens, a Korean system font stack, compact panels, and person-specific accents.
- Prefer Lucide icons for actions and existing shadcn/ui components for controls.
- Preserve accessibility affordances already present: semantic headings, labels, `aria-live` where useful, and role/name-friendly controls for Playwright tests.
- Camera capture and IndexedDB are browser/device capabilities. Keep album selection and storage failure paths working.

## Architecture Map

- `app/page.tsx` should remain a thin App Router entry that renders `SweatStampApp`.
- `app/layout.tsx` owns metadata, Korean HTML language, and the theme provider.
- `components/sweat-stamp-app.tsx` owns member selection, routines, photo selection, completion, and local persistence coordination.
- `components/ui/*` contains shadcn-generated primitives. Do not edit these directly unless the task is explicitly about the primitive itself; prefer variants, semantic tokens, CSS variables, or wrapper composition.
- `lib/member-profiles.ts` is the single source for member IDs, display names, colors, character variants, and screen copy.
- `lib/certification-photo-store.ts` owns IndexedDB photo persistence. Keep browser failure handling and database upgrades backward compatible.
- `app/icon.svg` is the product icon. If it changes, check `app/manifest.ts` at the same time.

Respect the dependency direction in `CLAUDE.md`: lower-level modules should not import higher-level modules. In this repo, `lib` must not depend on `components` or `app`; shared logic belongs in `lib`.

## Data And Runtime Notes

- Routine text and certification metadata are stored in LocalStorage.
- Certification photos are stored in the `sweat-stamp` IndexedDB database.
- Data is currently device- and browser-local; do not imply cross-device sync in UI copy.
- Do not commit secrets or real credentials.

## Commands

- Install dependencies: `bun install`
- Development server: `bun dev`
- HTTPS LAN development server for physical phone sensor testing: `bun run dev:https`
  - If LAN IP auto-detection picks the wrong interface, set `LAN_IP=<address>` before running the command.
- Lint: `bun run lint`
- Unit/integration tests: `bun run test`
- Watch tests: `bun run test:watch`
- E2E tests: `bun run test:e2e`
- Production build: `bun run build`
- Production server: `bun start`

Before running E2E for the first time in a fresh environment, install Chromium with `bunx playwright install chromium`.

## Testing Expectations

- Every behavioral change needs measurable acceptance criteria and the lowest useful test boundary.
- Keep Vitest tests colocated as `<file>.test.ts` / `<file>.test.tsx`.
- Keep Playwright specs in `e2e/*.spec.ts`.
- Member profile changes should verify all four IDs and independent visual identities.
- Photo persistence changes should cover saving, browser reload restoration, deletion, and storage errors when practical.
- UI flow changes should update Playwright assertions for visible Korean copy, labels, and primary controls.
- For doc-only changes, tests are usually unnecessary; say that explicitly in the final response.

## Spec-Driven Workflow

This repository carries a Claude/Harness workflow:

1. Ideate: optional `artifacts/<feature>/idea.md`
2. Specify: `artifacts/<feature>/spec.md`
3. Sketch: optional `artifacts/<feature>/wireframe.html`
4. Plan: `artifacts/<feature>/plan.md`
5. Build: implementation plus `artifacts/<feature>/learnings.md`
6. Compound: promote repeated patterns only after user approval

When a feature artifact exists, treat `artifacts/<feature>/spec.md` as the behavioral contract. Derive tests from Success Criteria. If implementation and spec conflict, fix the implementation or ask the user to change the spec.

## Commit Style

Recent history mostly follows Conventional Commit style, especially:

- `feat: add squat coach app flow`
- `fix: detect squat reps from vertical phone motion`
- `style: refine squat coach interface`

Some older asset-only commits are plain imperative messages such as `update app icon` or `change background, icon image`, but new commits should prefer Conventional Commits: `feat:`, `fix:`, `style:`, `test:`, `docs:`, `refactor:`, or `chore:`.

Keep commits feature-scoped. When following a plan, prefer one meaningful commit per completed task if the user asks for commits.

## Documentation Rules

- Write source code in English unless the user explicitly requests another language.
- Engineering docs default to English. Product-facing docs may be Korean when matching the app/user context; `README.md` is currently Korean.
- Korean is appropriate for product UI copy and user-visible text because the current app is Korean.
- Do not add inline editorial/status annotations to documents. Use commits or separate decision records instead.
- Keep this `AGENTS.md` updated when workflow, commands, architecture boundaries, or test strategy materially change.
