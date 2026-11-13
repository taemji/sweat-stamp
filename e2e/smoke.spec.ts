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

  for (const memberName of ["TAEM", "SAEM", "YUM", "SSUK"]) {
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
  await page.getByRole("button", { name: "SAEM 선택" }).click();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("");
  await page.getByLabel("오늘의 운동").fill("필라테스");

  await page.getByRole("button", { name: "TAEM 선택" }).click();
  await expect(page.getByLabel("오늘의 운동")).toHaveValue("러닝 5km");
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
