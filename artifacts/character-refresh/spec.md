# Character Refresh

Replace the CSS shape characters with the illustrated animal characters, retheme each member to match their character, and let members certify without uploading a photo by stamping their main workout illustration.

## Members

| Member | Character | Main workout | Sub workout | Theme |
|---|---|---|---|---|
| TAEM | Bunny | Ballet | Stretching | Pink |
| SAM | Koala | Pilates | Stretching | Blue |
| SOOK | Leopard | Pilates | Stretching | Sage green |
| YOOM | Fawn | Diet Dance | Stretching | Lavender |

Source images live outside the repo in `sweat-stamp-img/`. `taem_id2.png` and `taem_ballet2.png` are not used.

## Scenarios

### S1. Member screen shows the illustrated character
- Opening a member screen shows that member's ID portrait as the main character image, labelled `<NAME> 캐릭터`.
- Member tabs and the monthly summary rows show the member's face as the avatar.
- Every member screen uses colors derived from the character illustration.

### S2. Main and sub workout are preset
- With no saved routine, `오늘의 운동` is prefilled with the member's main workout in English.
- Two quick-select chips show the main workout and `Stretching`. Tapping a chip sets `오늘의 운동` to that value and marks it as selected.
- A routine the member typed earlier still wins over the preset.

### S3. Certify without a photo
- `오늘 인증 남기기` is enabled once `오늘의 운동` is not empty and `운동 완료` is checked. A photo is optional.
- With no photo selected, the photo area shows the member's main workout illustration and explains that the stamp will be placed on it.
- Certifying without a photo saves the main workout illustration with the `SWEAT STAMP`, member name, and date-time stamp as that day's certification photo.
- After reload, the completed screen shows the stamped illustration as `<NAME>의 오늘 운동 사진`.
- Choosing a camera or album photo still stamps and saves that photo instead.

### S4. App icon and share image
- The app icon, Apple touch icon, and PWA manifest icons use the four-character face image.
- Link previews use the four-character workout image.

## Success Criteria

1. Member profiles define `mainWorkout` = Ballet, Pilates, Pilates, Diet Dance and `subWorkout` = Stretching for TAEM, SAM, SOOK, YOOM.
2. Each member has four distinct accent colors, and white text on each accent meets a contrast ratio of 4.5:1 or higher.
3. Each member has a distinct portrait, avatar, and workout image path, and each file exists under `public/`.
4. E2E: a new member screen shows `<NAME> 캐릭터` as an image and `오늘의 운동` prefilled with the main workout.
5. E2E: tapping the `Stretching` chip changes `오늘의 운동` to `Stretching`.
6. E2E: with the routine filled and `운동 완료` checked, and no photo selected, certification succeeds and survives a reload with a stamped JPEG photo.
7. The manifest lists PNG icons that exist under `public/`, including a maskable icon.

## Out of Scope

- Changing the Supabase schema.
- Onboarding or splash screens.
