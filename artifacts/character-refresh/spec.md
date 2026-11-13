# Character Refresh

Replace the CSS shape characters with the illustrated animal characters, retheme each member to match their character, greet each member with their workout and weekly progress, and let members certify without uploading a photo by stamping their main workout illustration.

## Members

| Member | Character | Main workout | Sub workout | Theme |
|---|---|---|---|---|
| TAEM | Bunny | Ballet | Stretching | Pink |
| SAM | Koala | Pilates | Stretching | Blue |
| SOOK | Leopard | Pilates | Stretching | Sage green |
| YOOM | Fawn | Diet Dance | Stretching | Lavender |

The shared calendar uses a cream team theme and the four-character lineup illustration. Source images live outside the repo in `sweat-stamp-img/`. `taem_id2.png` and `taem_ballet2.png` are not used.

## Scenarios

### S1. Header and navigation
- The header shows `Sweat Stamp`. A storage notice appears only when shared storage failed (`공동 저장에 연결하지 못해 이 기기에만 저장돼요`). Without Supabase configuration (local development) the app saves on the device without a notice.
- The navigation shows each member's face. The selected member also shows their name, and members who certified today show a check labelled `인증 완료`.
- The calendar button opens the shared calendar.

### S2. Member greeting
- Before certifying, the hero shows today's date (`SAT · NOV 14`), `안녕, <NAME>.`, and `오늘 <workout> 하고 도장 하나 찍어 볼까요?`, where `<workout>` is the selected workout.
- After certifying, the hero shows `오늘도 해냈어요.` and `<NAME>의 이번 주 <ordinal> 도장이에요.`, where the ordinal is this week's count (`첫 번째`, `두 번째`, …).
- A Monday-to-Sunday strip shows this week's certified days, labelled `이번 주 <n>회 인증`.

### S3. Choosing the workout
- The main workout is selected by default. Rows `01 MAIN <main>`, `02 SUB Stretching`, and a `03` field labelled `오늘의 운동` (placeholder `직접 입력`) choose the workout.
- A typed workout is kept for the day it was entered. On a later day, or when the field is cleared, the main workout is selected again. Routines saved without a date are ignored.

### S4. Certifying
- One button, `오늘 <workout> 완료 · 도장 찍기`, certifies the workout. It is disabled only while shared storage is connecting, with the hint `공동 저장에 연결하는 중이에요.` above it.
- With no photo selected, the photo area shows the main workout illustration with a preview of the stamp, and certifying saves that illustration with the `SWEAT STAMP`, member name, and date-time stamp.
- Choosing a camera or album photo stamps and saves that photo instead.
- After certifying, the sheet shows the stamped photo (`<NAME>의 오늘 운동 사진`), the workout, `<time>에 찍은 도장`, and a `다시 인증` button.

### S5. Shared calendar
- The hero says how many members certified today: `오늘 첫 도장은 누가 찍을까요?`, `<total>명 중 <n>명이 도장 찍었어요.`, or `오늘은 모두 해냈어요.`
- Below the greeting, the four characters from `team_lineup.png` stand in a row. Characters who certified today are shown in full color, the others are faded, and tapping a character opens that member's screen. Each character shows this month's count under their feet.
- The month grid starts on Monday, shows only the weeks it needs, and marks each day with a dot per certified member. There is no separate per-member list.

### S6. App icon and share image
- The app icon, Apple touch icon, and PWA manifest icons use the four-character face image.
- Link previews use the four-character workout image.

## Success Criteria

1. Member profiles define `mainWorkout` = Ballet, Pilates, Pilates, Diet Dance and `subWorkout` = Stretching for TAEM, SAM, SOOK, YOOM.
2. Each member has a distinct accent, and white text on each accent has a contrast ratio of 4.5:1 or higher. The team accent has 4.5:1 or higher on the team background.
3. Each member has a distinct portrait, avatar, and workout image path, and each file exists under `public/`.
4. E2E: a member screen shows `<NAME> 캐릭터` as an image and the main workout row selected.
5. E2E: tapping `Stretching` selects it; a custom workout survives a reload on the same day; a workout from an earlier day and a cleared field fall back to the main workout.
6. E2E: with no photo selected, tapping `오늘 <workout> 완료 · 도장 찍기` certifies, the greeting changes to `오늘도 해냈어요.`, and a stamped JPEG photo survives a reload.
7. E2E: the calendar greeting and the character row reflect today's certifications.
8. The manifest lists PNG icons that exist under `public/`, including a maskable icon.

## Out of Scope

- Changing the Supabase schema.
- Onboarding or splash screens.
