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
  await expect(page.getByRole("button", { name: "전체 캘린더" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("공동 인증 캘린더")).toBeVisible();
  await expect(page.getByRole("button", { name: "이전 달" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 달" })).toBeVisible();

  for (const memberName of ["TAEM", "SAM", "SSUK", "YOOM"]) {
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
    window.localStorage.setItem("sweat-stamp:routines", JSON.stringify({ saem: "필라테스", yum: "러닝" }));
    window.localStorage.setItem("sweat-stamp:certifications", JSON.stringify({
      "2026-11-13:saem": { completedAt: "2026-11-13T00:00:00.000Z", memberId: "saem", photoName: "sam.png", routine: "필라테스" },
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
  expect(migratedStorage.routines).toEqual({ sam: "필라테스", yoom: "러닝" });
  expect(Object.keys(migratedStorage.certifications).sort()).toEqual(["2026-11-13:sam", "2026-11-13:yoom"]);
});

test("photo and workout check complete today's certification", async ({ page }) => {
  await page.getByRole("button", { name: "TAEM 선택" }).click();
  const certifyButton = page.getByRole("button", { name: "오늘 인증 남기기" });

  await expect(certifyButton).toBeDisabled();
  await page.getByLabel("오늘의 운동").fill("웨이트 40분");
  await page.getByRole("button", { name: "운동 완료" }).click();
  await page.getByLabel("운동 사진 선택").setInputFiles("app/icon.svg");
  await expect(page.getByRole("img", { name: "TAEM 운동 인증 미리보기" })).toBeVisible();
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
