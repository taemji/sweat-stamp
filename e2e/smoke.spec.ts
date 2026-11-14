import { expect, test } from "@playwright/test";

function seoulDatePart(part: "day" | "month") {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", [part]: "numeric" }).format(new Date());
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    window.localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase("sweat-stamp");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
});

test("home opens the shared calendar before member screens", async ({ page }) => {
  await expect(page).toHaveTitle("Sweat Stamp");
  await expect(page.getByRole("heading", { name: "Sweat Stamp" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "전체 캘린더" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("도장 캘린더")).toBeVisible();
  await expect(page.getByRole("heading", { name: "오늘 첫 도장은 누가 찍을까요?" })).toBeVisible();
  await expect(page.getByRole("button", { name: `TAEM 오늘 인증 전, ${seoulDatePart("month")}월 0회, 인증 화면 열기` })).toBeVisible();
  await page.getByRole("button", { name: "다음 달" }).click();
  const nextMonth = (Number(seoulDatePart("month")) % 12) + 1;
  await expect(page.getByRole("button", { name: `TAEM 오늘 인증 전, ${nextMonth}월 0회, 인증 화면 열기` })).toBeVisible();
  await page.getByRole("button", { name: "이전 달" }).click();
  await expect(page.getByRole("button", { name: "이전 달" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 달" })).toBeVisible();

  for (const memberName of ["TAEM", "SAM", "SOOK", "YOOM"]) {
    const memberButton = page.getByRole("button", { name: `${memberName} 선택` });
    await expect(memberButton).toBeVisible();
    await memberButton.click();
    await expect(page.getByRole("heading", { name: memberName })).toBeVisible();
    await expect(page.getByRole("img", { name: `${memberName} 캐릭터` })).toBeVisible();
    await expect(page.getByLabel("오늘의 운동")).toHaveAttribute("placeholder", "직접 입력");
  }
});

test("main workout is preset and stretching is one tap away", async ({ page }) => {
  const mainWorkouts = { TAEM: "Ballet", SAM: "Pilates", SOOK: "Pilates", YOOM: "Diet Dance" };

  for (const [memberName, mainWorkout] of Object.entries(mainWorkouts)) {
    await page.getByRole("button", { name: `${memberName} 선택` }).click();
    await expect(page.getByRole("button", { name: mainWorkout, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("오늘의 운동")).toHaveValue("");
  }

  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await page.getByRole("button", { name: "Stretching", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stretching", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Ballet", exact: true })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "SAM 선택" }).click();
  await expect(page.getByRole("button", { name: "Pilates", exact: true })).toHaveAttribute("aria-pressed", "true");

  const sydneyDay = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Sydney", weekday: "short", month: "short", day: "numeric" })
    .formatToParts(new Date())
    .map((part) => [part.type, part.value.toUpperCase()]));
  await expect(page.getByText(`${sydneyDay.weekday} · ${sydneyDay.month} ${sydneyDay.day}`, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await page.getByLabel("오늘의 운동").fill("Barre");
  await expect(page.getByRole("button", { name: "Stretching", exact: true })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "SAM 선택" }).click();
  const workoutField = page.getByLabel("오늘의 운동");
  await workoutField.pressSequentially("Pilates reformer");
  await expect(workoutField).toHaveValue("Pilates reformer");
  await expect(page.getByRole("button", { name: "Pilates", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(workoutField).toHaveAttribute("maxlength", "120");
});

test("certifying without a photo stamps the main workout illustration", async ({ page }) => {
  await page.getByRole("button", { name: "YOOM 선택" }).click();
  await expect(page.getByRole("heading", { name: "안녕, YOOM." })).toBeVisible();
  await expect(page.getByText("Diet Dance 하고")).toBeVisible();
  await expect(page.getByLabel("이번 주 0회 인증")).toBeVisible();
  await expect(page.getByRole("img", { name: "YOOM 기본 인증 이미지" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내 사진으로 바꾸기" })).toBeVisible();
  await expect(page.getByLabel("운동 사진 선택")).not.toHaveAttribute("capture");

  const certifyButton = page.getByRole("button", { name: "오늘 Diet Dance 완료 · 도장 찍기" });
  await expect(certifyButton).toBeEnabled();
  await certifyButton.click();

  await expect(page.getByRole("heading", { name: "오늘도 해냈어요." })).toBeVisible();
  await expect(page.locator(".certification-complete").getByText("Diet Dance")).toBeVisible();
  await expect(page.getByText("첫 번째 도장이에요.")).toBeVisible();
  await expect(page.getByLabel("이번 주 1회 인증")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "YOOM 선택" }).click();

  const completedPhoto = page.getByRole("img", { name: "YOOM의 오늘 운동 사진" });
  await expect(completedPhoto).toBeVisible();
  const photoType = await completedPhoto.evaluate(async (photo) => {
    const photoUrl = getComputedStyle(photo).backgroundImage.slice(5, -2);
    return fetch(photoUrl).then((response) => response.blob()).then((blob) => blob.type);
  });
  expect(photoType).toBe("image/jpeg");
});

test("member routines stay independent", async ({ page }) => {
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await page.getByLabel("오늘의 운동").fill("러닝 5km");
  await page.getByRole("button", { name: "SAM 선택" }).click();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("");
  await page.getByLabel("오늘의 운동").fill("필라테스");

  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("러닝 5km");
});

test("a custom workout lasts for today only", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("sweat-stamp:routines", JSON.stringify({ dateKey: "2020-01-01", routines: { taem: "숨쉬기" } }));
  });
  await page.reload();
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByRole("button", { name: "Ballet", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ballet 하고")).toBeVisible();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("");

  await page.getByLabel("오늘의 운동").fill("숨쉬기");
  await expect(page.getByText("숨쉬기 하고")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("숨쉬기");
  await expect(page.getByRole("button", { name: "Ballet", exact: true })).toHaveAttribute("aria-pressed", "false");

  await page.getByLabel("오늘의 운동").fill("");
  await expect(page.getByRole("button", { name: "Ballet", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ballet 하고")).toBeVisible();

  await page.getByLabel("오늘의 운동").fill("Barre  ");
  await expect(page.getByRole("button", { name: /도장 찍기$/ })).toHaveAccessibleName("오늘 Barre 완료 · 도장 찍기");
});

test("legacy member ids migrate to sam and yoom", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("sweat-stamp:selected-member", "saem");
    window.localStorage.setItem("sweat-stamp:routines", JSON.stringify({ saem: "필라테스", ssuk: "수영", yum: "러닝" }));
    window.localStorage.setItem("sweat-stamp:certifications", JSON.stringify({
      "2026-11-13:saem": { completedAt: "2026-11-13T00:00:00.000Z", memberId: "saem", photoName: "sam.png", routine: "필라테스" },
      "2026-11-13:ssuk": { completedAt: "2026-11-13T00:00:00.000Z", memberId: "ssuk", photoName: "sook.png", routine: "수영" },
      "2026-11-13:yum": { completedAt: "2026-11-13T00:00:00.000Z", memberId: "yum", photoName: "yoom.png", routine: "러닝" },
    }));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("sweat-stamp:selected-member"))).toBe("sam");

  const migratedStorage = await page.evaluate(() => ({
    selectedMember: window.localStorage.getItem("sweat-stamp:selected-member"),
    routines: JSON.parse(window.localStorage.getItem("sweat-stamp:routines") ?? "{}"),
    certifications: JSON.parse(window.localStorage.getItem("sweat-stamp:certifications") ?? "{}"),
  }));

  expect(migratedStorage.selectedMember).toBe("sam");
  expect(migratedStorage.routines.routines).toEqual({});
  expect(Object.keys(migratedStorage.certifications).sort()).toEqual(["2026-11-13:sam", "2026-11-13:sook", "2026-11-13:yoom"]);
});

test("a picked photo is stamped and certifies today", async ({ page }) => {
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  const certifyButton = page.getByRole("button", { name: /도장 찍기$/ });

  await page.getByLabel("오늘의 운동").fill("웨이트 40분");
  await expect(certifyButton).toHaveAccessibleName("오늘 웨이트 40분 완료 · 도장 찍기");
  const workoutPhoto = await page.screenshot({ type: "png" });
  await page.getByLabel("운동 사진 선택").setInputFiles({
    name: "workout.png",
    mimeType: "image/png",
    buffer: workoutPhoto,
  });
  await expect(page.getByRole("img", { name: "TAEM 운동 인증 미리보기" })).toBeVisible();

  const stampedPhoto = await page.getByRole("img", { name: "TAEM 운동 인증 미리보기" }).evaluate(async (preview) => {
    const backgroundImage = getComputedStyle(preview).backgroundImage;
    const photoUrl = backgroundImage.slice(5, -2);
    const photoBlob = await fetch(photoUrl).then((response) => response.blob());
    const bitmap = await createImageBitmap(photoBlob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    context.drawImage(bitmap, 0, 0);
    const upperPixel = context.getImageData(Math.floor(bitmap.width / 2), Math.floor(bitmap.height * 0.35), 1, 1).data;
    const lowerPixel = context.getImageData(Math.floor(bitmap.width / 2), Math.floor(bitmap.height * 0.94), 1, 1).data;
    bitmap.close();

    return {
      height: canvas.height,
      lowerBrightness: lowerPixel[0] + lowerPixel[1] + lowerPixel[2],
      type: photoBlob.type,
      upperBrightness: upperPixel[0] + upperPixel[1] + upperPixel[2],
      width: canvas.width,
    };
  });

  expect(stampedPhoto.type).toBe("image/jpeg");
  expect(stampedPhoto.width).toBeGreaterThan(0);
  expect(stampedPhoto.height).toBeGreaterThan(0);
  expect(stampedPhoto.lowerBrightness).toBeLessThan(stampedPhoto.upperBrightness);
  await expect(certifyButton).toBeEnabled();
  await certifyButton.click();

  await expect(page.getByRole("heading", { name: "오늘도 해냈어요." })).toBeVisible();
  await expect(page.getByRole("button", { name: "TAEM 선택, 오늘 인증 완료" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("도장 캘린더")).toBeVisible();
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByRole("img", { name: "TAEM의 오늘 운동 사진" })).toBeVisible();

  await page.getByRole("button", { name: "전체 캘린더" }).click();
  const todayNumber = seoulDatePart("day");
  await expect(page.getByLabel(`${todayNumber}일, TAEM 인증 완료`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "4명 중 1명이 도장 찍었어요." })).toBeVisible();
  await expect(page.getByText("남은 세 명도 같이 가 볼까요?")).toBeVisible();
  await expect(page.getByRole("button", { name: `TAEM 오늘 인증 완료, ${seoulDatePart("month")}월 1회, 인증 화면 열기` })).toBeVisible();
});

test("a calendar day opens everyone's stamps for that day", async ({ page }) => {
  await page.getByRole("button", { name: /^YOOM 선택/ }).click();
  await page.getByRole("button", { name: /도장 찍기$/ }).click();
  await expect(page.getByRole("heading", { name: "오늘도 해냈어요." })).toBeVisible();
  await page.getByRole("button", { name: "전체 캘린더" }).click();

  const dayLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" }).format(new Date());
  await page.getByRole("button", { name: `${seoulDatePart("day")}일, YOOM 인증 완료, 인증 사진 보기` }).click();

  await expect(page.getByRole("heading", { name: dayLabel })).toBeVisible();
  await expect(page.getByLabel("4명 중 1명 인증")).toBeVisible();
  await expect(page.getByRole("img", { name: `YOOM ${dayLabel} 인증 사진` })).toBeVisible();

  await page.getByRole("button", { name: "YOOM 인증 사진 크게 보기" }).click();
  const lightbox = page.getByRole("dialog", { name: `YOOM ${dayLabel} 인증 사진` });
  await expect(lightbox).toBeVisible();
  await expect(lightbox.getByRole("img", { name: `YOOM ${dayLabel} 인증 사진 확대` })).toBeVisible();
  await expect(lightbox).toContainText("Diet Dance");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await page.getByRole("button", { name: "YOOM 인증 사진 크게 보기" }).click();
  await lightbox.getByRole("button", { name: "닫기" }).click();
  await expect(lightbox).toBeHidden();
  await expect(page.getByRole("button", { name: "TAEM 화면 열기" })).toContainText("Not yet");

  await page.getByRole("button", { name: "캘린더로 돌아가기" }).click();
  await expect(page.getByLabel("도장 캘린더")).toBeVisible();

  await page.getByRole("button", { name: `${seoulDatePart("day")}일, YOOM 인증 완료, 인증 사진 보기` }).click();
  await page.getByRole("button", { name: "YOOM 화면 열기" }).click();
  await expect(page.getByRole("heading", { name: "오늘도 해냈어요." })).toBeVisible();
});
