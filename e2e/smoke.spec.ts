import { expect, test } from "@playwright/test";

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
  await expect(page.getByText(/이 기기에 저장/)).toBeVisible();
  await expect(page.getByRole("button", { name: "전체 캘린더" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("공동 인증 캘린더")).toBeVisible();
  await expect(page.getByRole("button", { name: "이전 달" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 달" })).toBeVisible();

  for (const memberName of ["TAEM", "SAM", "SOOK", "YOOM"]) {
    const memberButton = page.getByRole("button", { name: `${memberName} 선택` });
    await expect(memberButton).toBeVisible();
    await memberButton.click();
    await expect(page.getByRole("heading", { name: memberName })).toBeVisible();
    await expect(page.getByLabel(`${memberName} 캐릭터`)).toHaveText("");
    await expect(page.getByPlaceholder(`${memberName}의 운동을 입력하세요`)).toBeVisible();
  }
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

  const migratedStorage = await page.evaluate(() => ({
    selectedMember: window.localStorage.getItem("sweat-stamp:selected-member"),
    routines: JSON.parse(window.localStorage.getItem("sweat-stamp:routines") ?? "{}"),
    certifications: JSON.parse(window.localStorage.getItem("sweat-stamp:certifications") ?? "{}"),
  }));

  expect(migratedStorage.selectedMember).toBe("sam");
  expect(migratedStorage.routines).toEqual({ sam: "필라테스", sook: "수영", yoom: "러닝" });
  expect(Object.keys(migratedStorage.certifications).sort()).toEqual(["2026-11-13:sam", "2026-11-13:sook", "2026-11-13:yoom"]);
});

test("photo and workout check complete today's certification", async ({ page }) => {
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  const certifyButton = page.getByRole("button", { name: "오늘 인증 남기기" });

  await expect(certifyButton).toBeDisabled();
  await page.getByLabel("오늘의 운동").fill("웨이트 40분");
  await page.getByRole("button", { name: "운동 완료" }).click();
  const workoutPhoto = await page.screenshot({ type: "png" });
  await page.getByLabel("운동 사진 선택").setInputFiles({
    name: "workout.png",
    mimeType: "image/png",
    buffer: workoutPhoto,
  });
  await expect(page.getByRole("img", { name: "TAEM 운동 인증 미리보기" })).toBeVisible();
  await expect(page.getByText(/사진에 TAEM · .* 인증 정보가 저장돼요/)).toBeVisible();

  const stampedPhoto = await page.locator(".photo-preview").evaluate(async (preview) => {
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

  await expect(page.getByRole("heading", { name: "오늘 인증 완료" })).toBeVisible();
  await expect(page.getByRole("button", { name: "TAEM 인증 완료" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("공동 인증 캘린더")).toBeVisible();
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByRole("img", { name: "TAEM의 오늘 운동 사진" })).toBeVisible();

  await page.getByRole("button", { name: "전체 캘린더" }).click();
  const todayNumber = String(new Date().getDate());
  await expect(page.getByLabel(`${todayNumber}일, TAEM 인증 완료`)).toBeVisible();
  await expect(page.getByRole("button", { name: "TAEM 이번 달 1회, 인증 화면 열기" })).toBeVisible();
});
