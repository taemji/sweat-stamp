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
- The header shows `Sweat Stamp`. A notice appears only when shared storage cannot be reached (`인터넷 연결이 불안정해요. 지금 찍는 도장은 친구들에게 아직 안 보여요.`). Stamps made then, or whose upload fails, are kept on the device and uploaded automatically: every 30 seconds while offline and as soon as the browser is back online. If the server already has a stamp for the same member and day, the earlier stamp is kept. While offline, the shared calendar says `친구들 기록을 불러오지 못했어요.` instead of a team count. Without Supabase configuration (local development) the app saves on the device without a notice.
- The navigation shows each member's face. The selected member also shows their name, and members who certified today show a check labelled `인증 완료`.
- The calendar button opens the shared calendar.

### S2. Member greeting
- Before certifying, the hero shows today's date (`SAT · NOV 14`), `안녕, <NAME>.`, and `오늘 <workout> 하고 도장 하나 찍어 볼까요?`, where `<workout>` is the selected workout.
- After certifying, the hero shows `오늘도 해냈어요.` and `<NAME>의 이번 주 <ordinal> 도장이에요.`, where the ordinal is this week's count (`첫 번째`, `두 번째`, …).
- A Monday-to-Sunday strip shows this week's certified days, labelled `이번 주 <n>회 인증`.

### S3. Choosing the workout
- The main workout is selected by default. Rows `<main>`, `Stretching`, and a field labelled `오늘의 운동` (placeholder `직접 입력`, up to 120 characters) choose the workout. The selected row, including the field, shows a check.
- Text typed into the field stays as typed even when it starts with a preset name (for example `Pilates reformer`).
- A typed workout is kept for the day it was entered. On a later day, or when the field is cleared, the main workout is selected again. Routines saved without a date are ignored.

### S4. Certifying
- One button, `오늘 <workout> 완료 · 도장 찍기`, certifies the workout. Long workout names are cut with an ellipsis on one line. 
- `내 사진으로 바꾸기` lets the member take a photo or pick one from the album.
- With no photo selected, the photo area shows the main workout illustration with a preview of the stamp, and certifying saves that illustration with the `SWEAT STAMP`, member name, and date-time stamp.
- Choosing a camera or album photo stamps and saves that photo instead.
- After certifying, the sheet shows the stamped photo (`<NAME>의 오늘 운동 사진`), the workout, `<time>에 찍은 도장`, and a `다시 인증` button.

### S5. Shared calendar
- The hero says how many members certified today: `오늘 첫 도장은 누가 찍을까요?`, `<total>명 중 <n>명이 도장 찍었어요.`, or `오늘은 모두 해냈어요.`
- Below the greeting, the four characters from `team_lineup.png` stand in a row. Characters who certified today are shown in full color, the others are faded, and tapping a character opens that member's screen. Each character shows their count for the month shown in the calendar below, so the counts follow `이전 달` and `다음 달`.
- The month grid starts on Monday, shows only the weeks it needs, and marks each day with a dot per certified member. There is no separate per-member list.

### S6. App icon and share image
- The app icon, Apple touch icon, and PWA manifest icons use the four-character face image.
- Link previews use the four-character workout image.

### S7. Time zones and loading
- Each member's day, stamp times, weekly strip, and today's status use their own time zone (SAM: Australia/Sydney; others: Asia/Seoul). Calendar dots and monthly counts file each certification under the member's own date, so a SAM stamp just after Sydney midnight on the 1st counts toward the new month even while Seoul is still on the previous day.
- The shared calendar opens on the current month in Seoul and marks Seoul's today.
- Until stored certifications have loaded, the screens show `오늘 기록을 불러오는 중이에요.` instead of counts, statuses, or the certify form. Loading gives up after 10 seconds and continues offline.
- The workout date is the member's date at the time on the stamp, so the photo and the record always agree.
- `다시 인증` on a shared certification is refused with `인터넷에 다시 연결된 뒤 시도해 주세요.` while shared storage is unreachable.
- Stamp times read like `오전 6:33`, on the photo and in `<time>에 찍은 도장`.

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
