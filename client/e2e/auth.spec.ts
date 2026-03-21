/**
 * E2E: Auth flows + middleware protection
 *
 * Covers:
 *  1. Unauthenticated access to /training redirects to /auth
 *  2. Unauthenticated access to /live redirects to /auth
 *  3. Sign-up with a fresh email creates an account and lands on /training
 *  4. Sign-out redirects to /auth and clears the session cookie
 *  5. Sign-in with valid credentials lands on /training
 *  6. Sign-in with wrong password shows an error (no redirect)
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Persistent test account used across sign-in tests
const TEST_EMAIL = `e2e-auth-${Date.now()}@univoice.test`;
const TEST_PASSWORD = "TestPass123!";

// Admin client to pre-create the test user before sign-in tests
async function ensureTestUser() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  await sb.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
}

test.beforeAll(ensureTestUser);

// ── helpers ──────────────────────────────────────────────────────────────────

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
  // Use the form submit button, not the mode-toggle button
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/training", { timeout: 10_000 });
}

// ── tests ─────────────────────────────────────────────────────────────────────

test("middleware: /training redirects unauthenticated users to /auth", async ({
  page,
}) => {
  await page.goto("/training");
  await expect(page).toHaveURL(/\/auth/);
});

test("middleware: /live redirects unauthenticated users to /auth", async ({
  page,
}) => {
  await page.goto("/live");
  await expect(page).toHaveURL(/\/auth/);
});

test("auth page renders sign-in form by default", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.getByPlaceholder("••••••••")).toBeVisible();
});

test("sign-up: new email creates account, session exists, /training accessible", async ({
  page,
}) => {
  const email = `e2e-signup-${Date.now()}@univoice.test`;
  await page.goto("/auth");
  // Switch to sign-up mode
  await page.getByRole("button", { name: /create account/i }).first().click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("TestPass123!");
  await page.locator("form").getByRole("button", { name: /create account/i }).click();
  // Auth page shows "Check your email" confirmation screen
  await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 8_000 });
  // Session is created immediately (email confirm off) — navigate directly to /training
  await page.goto("/training");
  await expect(page).toHaveURL(/\/training/);
});

test("sign-in: valid credentials land on /training", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/training/);
});

test("sign-in: wrong password shows error and stays on /auth", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
  await page.getByPlaceholder("••••••••").fill("wrong-password");
  await page.locator("form").getByRole("button", { name: /sign in/i }).click();
  // Should stay on /auth and show an error
  await expect(page).toHaveURL(/\/auth/);
  await expect(page.locator("p.text-red-600, p.text-xs.text-red-600")).toBeVisible({
    timeout: 5_000,
  });
});

test("sign-out: clears session and redirects to /auth", async ({ page }) => {
  await signIn(page);
  // Click sign out button in header
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth/, { timeout: 8_000 });
  // Trying to go back to /training should redirect again
  await page.goto("/training");
  await expect(page).toHaveURL(/\/auth/);
});

test("session persistence: reload /training keeps user logged in", async ({
  page,
}) => {
  await signIn(page);
  await page.reload();
  await expect(page).toHaveURL(/\/training/);
});
