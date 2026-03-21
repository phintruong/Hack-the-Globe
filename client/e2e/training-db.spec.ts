/**
 * E2E: Training page ↔ Supabase DB integration
 *
 * Covers:
 *  1. Session count shows "0 sessions" for a brand-new user
 *  2. Demo submit → STAR feedback appears
 *  3. Session count increments to 1 after first submit
 *  4. "Next Question" resets feedback panel
 *  5. Second demo submit → session count increments to 2
 *  6. Supabase row count matches what the UI shows
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_EMAIL = `e2e-db-${Date.now()}@univoice.test`;
const TEST_PASSWORD = "TestPass123!";

// Sign up the test user once and reuse across all tests in this file
test.beforeAll(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await sb.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
});

// Delete all saved sessions before each test so counts start from 0
test.beforeEach(async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { user } } = await sb.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (user) {
    await sb.from("training_sessions").delete().eq("user_id", user.id);
  }
  await sb.auth.signOut();
});

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/training", { timeout: 10_000 });
}

async function enableDemoMode(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /demo mode/i }).click();
  await expect(page.getByRole("button", { name: /demo mode/i })).toContainText("ON");
}

// ── tests ─────────────────────────────────────────────────────────────────────

test("new user starts with 0 sessions shown in header", async ({ page }) => {
  await signIn(page);
  // The session count badge: "· 0 sessions"
  await expect(page.locator("text=/0 sessions/")).toBeVisible({ timeout: 6_000 });
});

// Helper: submit demo answer and wait for STAR feedback to appear
async function submitDemoAndWaitForFeedback(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /demo.*submit.*sample answer/i }).click();
  // "STAR Evaluation" card title is the reliable signal that feedback rendered
  await expect(page.getByText("STAR Evaluation")).toBeVisible({ timeout: 45_000 });
}

test("demo submit returns STAR feedback panel", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 8_000 });
  await enableDemoMode(page);
  await submitDemoAndWaitForFeedback(page);
  // Individual score labels should be visible
  await expect(page.getByText("Situation")).toBeVisible();
  await expect(page.getByText("Action")).toBeVisible();
});

test("session count increments by 1 after demo submit", async ({ page }) => {
  // Get baseline count before test
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await sb.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const { count: baseline } = await sb
    .from("training_sessions")
    .select("id", { count: "exact", head: true });
  await sb.auth.signOut();

  await signIn(page);
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 8_000 });
  await enableDemoMode(page);
  await submitDemoAndWaitForFeedback(page);

  const badge = page.locator("span.text-\\[\\#0077b6\\]");
  const expectedCount = (baseline ?? 0) + 1;
  // Poll until the async Supabase insert + state update renders
  await expect.poll(
    async () => {
      const text = await badge.textContent();
      return parseInt(text?.match(/(\d+)/)![1] ?? "0", 10);
    },
    { timeout: 15_000 }
  ).toBe(expectedCount);
});

test("Next Question button resets feedback panel", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 8_000 });
  await enableDemoMode(page);
  await submitDemoAndWaitForFeedback(page);
  await page.getByRole("button", { name: /next question/i }).click();
  await expect(page.getByText("STAR Evaluation")).not.toBeVisible({ timeout: 3_000 });
});

test("second submit increments session count by 2 total", async ({ page }) => {
  // Get baseline count from DB before the test
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await sb.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const { count: baseline } = await sb
    .from("training_sessions")
    .select("id", { count: "exact", head: true });
  await sb.auth.signOut();

  await signIn(page);
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 8_000 });
  await enableDemoMode(page);

  await submitDemoAndWaitForFeedback(page);
  await page.getByRole("button", { name: /next question/i }).click();

  // Demo mode persists across questions
  await submitDemoAndWaitForFeedback(page);

  const badge = page.locator("span.text-\\[\\#0077b6\\]");
  const expectedCount = (baseline ?? 0) + 2;
  await expect.poll(
    async () => {
      const text = await badge.textContent();
      return parseInt(text?.match(/(\d+)/)![1] ?? "0", 10);
    },
    { timeout: 15_000 }
  ).toBe(expectedCount);
});

test("DB row count matches UI session count", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 8_000 });
  await enableDemoMode(page);
  await submitDemoAndWaitForFeedback(page);

  // Read count from UI badge (e.g. "· 1 sessions")
  const badge = page.locator("span.text-\\[\\#0077b6\\]");
  await expect(badge).toBeVisible({ timeout: 5_000 });
  const badgeText = await badge.textContent();
  const uiCount = parseInt(badgeText!.match(/(\d+)/)![1], 10);

  // Verify against Supabase directly
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await sb.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const { count } = await sb
    .from("training_sessions")
    .select("id", { count: "exact", head: true });

  expect(count).toBe(uiCount);
});
