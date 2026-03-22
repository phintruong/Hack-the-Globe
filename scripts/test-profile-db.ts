/**
 * Integration tests against the real Supabase database.
 * Tests: profiles, user_entitlements, user_module_progress, and RLS isolation.
 *
 * Run with: cd server && npx tsx ../scripts/test-profile-db.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fhjvkeaudihbvvrjpfvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoanZrZWF1ZGloYnZ2cmpwZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDIzNDIsImV4cCI6MjA4OTY3ODM0Mn0.pFIBJTsjS63oVjtsXug7BfMxaKXVon8e41p1mFmA0M4";

const ts = Date.now();
const USER_A_EMAIL = `univoice.test.a.${ts}@gmail.com`;
const USER_B_EMAIL = `univoice.test.b.${ts}@gmail.com`;
const TEST_PASSWORD = "Test1234!";

const SAMPLE_KG = {
  skills: ["Python", "TypeScript"],
  experiences: [{ role: "Engineer", company: "TestCo", duration: "2y", highlights: ["Built stuff"], bullets: [] }],
  education: [{ degree: "BSc CS", institution: "MIT", year: "2024", keywords: [] }],
  projects: [],
  strengths: ["Problem solving"],
  industries: ["Tech"],
  summary: "Test user summary",
};

// ── Counters ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
  failed++;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function createAndSignIn(
  email: string,
  password: string
): Promise<{ client: SupabaseClient; userId: string } | null> {
  const client = anonClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.user) {
    fail(`sign up ${email}`, error?.message);
    return null;
  }
  const { error: siErr } = await client.auth.signInWithPassword({ email, password });
  if (siErr) {
    fail(`sign in ${email}`, siErr.message);
    return null;
  }
  return { client, userId: data.user.id };
}

// ── Test Suites ──────────────────────────────────────────────────────────────

async function testTablesExist() {
  console.log("1. Tables exist");
  const client = anonClient();
  const tables = ["profiles", "user_entitlements", "user_module_progress", "modules", "module_questions"];
  for (const table of tables) {
    const { error } = await client.from(table).select("*").limit(0);
    // RLS may block data but should NOT return a "relation does not exist" error
    if (error && error.message.includes("does not exist")) {
      fail(`${table} table missing`, error.message);
    } else {
      ok(`${table} table exists`);
    }
  }
}

async function testProfilesCRUD(userId: string, client: SupabaseClient) {
  console.log("\n2. Profiles — CRUD");

  // Insert
  const { error: insErr } = await client.from("profiles").upsert(
    { user_id: userId, resume_text: "Initial resume", background: "SWE role", knowledge_graph: SAMPLE_KG },
    { onConflict: "user_id" }
  );
  if (insErr) { fail("insert profile", insErr.message); return; }
  ok("Insert profile");

  // Read back
  const { data, error: readErr } = await client
    .from("profiles")
    .select("resume_text, background, knowledge_graph")
    .eq("user_id", userId)
    .single();
  if (readErr || !data) { fail("read profile", readErr?.message); return; }
  if (data.resume_text === "Initial resume") ok("Resume text persisted");
  else fail("resume text mismatch", data.resume_text);
  if (data.background === "SWE role") ok("Background persisted");
  else fail("background mismatch", data.background);
  if ((data.knowledge_graph as typeof SAMPLE_KG)?.skills?.length === 2) ok("Knowledge graph persisted");
  else fail("knowledge graph mismatch", JSON.stringify(data.knowledge_graph));

  // Upsert / update
  const { error: upsertErr } = await client.from("profiles").upsert(
    { user_id: userId, resume_text: "Updated resume", background: "PM role", knowledge_graph: { ...SAMPLE_KG, skills: ["Python", "TypeScript", "Go"] } },
    { onConflict: "user_id" }
  );
  if (upsertErr) { fail("upsert profile", upsertErr.message); return; }
  const { data: updated } = await client.from("profiles").select("resume_text, knowledge_graph").eq("user_id", userId).single();
  if (updated?.resume_text === "Updated resume" && (updated?.knowledge_graph as typeof SAMPLE_KG)?.skills?.length === 3) {
    ok("Upsert updates existing row");
  } else {
    fail("upsert data mismatch");
  }
}

async function testProfilesRLSIsolation(userAId: string, clientA: SupabaseClient, userBId: string, clientB: SupabaseClient) {
  console.log("\n3. Profiles — RLS isolation");

  // Seed user B's profile first
  await clientB.from("profiles").upsert(
    { user_id: userBId, resume_text: "User B secret", background: "B background", knowledge_graph: SAMPLE_KG },
    { onConflict: "user_id" }
  );

  // User A must NOT see user B's row
  const { data: leaked } = await clientA
    .from("profiles")
    .select("resume_text")
    .eq("user_id", userBId)
    .single();
  if (!leaked) {
    ok("User A cannot read User B's profile");
  } else {
    fail("RLS breach: User A read User B's profile", leaked.resume_text);
  }

  // User A must NOT be able to upsert as user B
  const { error: writeErr } = await clientA.from("profiles").upsert(
    { user_id: userBId, resume_text: "Hijacked", background: "", knowledge_graph: null },
    { onConflict: "user_id" }
  );
  if (writeErr) {
    ok("User A cannot write to User B's profile (RLS blocked)");
  } else {
    // Verify the row was not actually changed
    const { data: check } = await clientB.from("profiles").select("resume_text").eq("user_id", userBId).single();
    if (check?.resume_text !== "Hijacked") {
      ok("User A write silently rejected by RLS (data unchanged)");
    } else {
      fail("RLS breach: User A overwrote User B's profile");
    }
  }
}

async function testAnonAccessBlocked() {
  console.log("\n4. Unauthenticated access blocked");
  const anon = anonClient();

  const { data, error } = await anon.from("profiles").select("*").limit(1);
  if (error || !data || data.length === 0) {
    ok("Anon cannot read profiles (RLS blocks or returns empty)");
  } else {
    fail("Anon read profiles — RLS not enforced", `${data.length} rows returned`);
  }

  const { error: writeErr } = await anon.from("profiles").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    resume_text: "anon write",
    background: "",
  });
  if (writeErr) {
    ok("Anon cannot write to profiles");
  } else {
    fail("Anon was able to write to profiles — RLS not enforced");
  }
}

async function testUserEntitlements(userId: string, client: SupabaseClient) {
  console.log("\n5. User entitlements");

  // Default: no row yet → handler should treat as free tier
  const { data: initial } = await client.from("user_entitlements").select("tier").eq("user_id", userId).single();
  if (!initial) {
    ok("No entitlement row by default (treated as free)");
  } else {
    ok(`Entitlement row exists with tier: ${initial.tier}`);
  }

  // Insert entitlement
  const { error: insErr } = await client.from("user_entitlements").upsert(
    { user_id: userId, tier: "free" },
    { onConflict: "user_id" }
  );
  if (insErr) { fail("insert entitlement", insErr.message); return; }
  ok("Insert free entitlement");

  const { data: row } = await client.from("user_entitlements").select("tier").eq("user_id", userId).single();
  if (row?.tier === "free") ok("Entitlement tier reads back correctly");
  else fail("entitlement tier mismatch", row?.tier);
}

async function testUserModuleProgress(userId: string, client: SupabaseClient) {
  console.log("\n6. User module progress");

  // Fetch a valid question id from the database
  const { data: questions, error: qErr } = await client
    .from("module_questions")
    .select("id")
    .limit(1)
    .single();
  if (qErr || !questions) {
    fail("No module_questions found — seed data missing", qErr?.message);
    return;
  }
  const questionId = questions.id;

  // Insert progress
  const { error: insErr } = await client.from("user_module_progress").upsert(
    { user_id: userId, question_id: questionId, best_score: 72, attempts: 1 },
    { onConflict: "user_id,question_id" }
  );
  if (insErr) { fail("insert progress", insErr.message); return; }
  ok("Insert module progress");

  // Read back
  const { data: prog, error: readErr } = await client
    .from("user_module_progress")
    .select("best_score, attempts")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .single();
  if (readErr || !prog) { fail("read progress", readErr?.message); return; }
  if (prog.best_score === 72) ok("best_score persisted correctly");
  else fail("best_score mismatch", String(prog.best_score));

  // Upsert with higher score
  await client.from("user_module_progress").upsert(
    { user_id: userId, question_id: questionId, best_score: 90, attempts: 2 },
    { onConflict: "user_id,question_id" }
  );
  const { data: updated } = await client
    .from("user_module_progress")
    .select("best_score, attempts")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .single();
  if (updated?.best_score === 90 && updated?.attempts === 2) ok("Score and attempts updated via upsert");
  else fail("progress upsert mismatch", JSON.stringify(updated));
}

async function testModulesPublicRead() {
  console.log("\n7. Modules are publicly readable");
  const anon = anonClient();
  const { data, error } = await anon.from("modules").select("id, title").limit(5);
  if (error) { fail("modules public read", error.message); return; }
  if (data && data.length > 0) ok(`Modules readable without auth (${data.length} rows)`);
  else fail("No modules found — seed data missing");

  const { data: questions, error: qErr } = await anon.from("module_questions").select("id").limit(1);
  if (qErr) { fail("module_questions public read", qErr.message); return; }
  if (questions && questions.length > 0) ok("module_questions readable without auth");
  else fail("No module_questions found — seed data missing");
}

async function cleanup(userAClient: SupabaseClient, userAId: string, userBClient: SupabaseClient, userBId: string) {
  console.log("\n8. Cleanup");
  await userAClient.from("profiles").delete().eq("user_id", userAId);
  await userAClient.from("user_entitlements").delete().eq("user_id", userAId);
  await userAClient.from("user_module_progress").delete().eq("user_id", userAId);
  await userBClient.from("profiles").delete().eq("user_id", userBId);
  ok("Test rows deleted");
  await userAClient.auth.signOut();
  await userBClient.auth.signOut();
  ok("Signed out");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("══ UniVoice Integration Tests ══\n");

  await testTablesExist();
  await testModulesPublicRead();
  await testAnonAccessBlocked();

  const a = await createAndSignIn(USER_A_EMAIL, TEST_PASSWORD);
  const b = await createAndSignIn(USER_B_EMAIL, TEST_PASSWORD);
  if (!a || !b) {
    console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
    console.log("Aborting: could not create test users (email confirmations may be required).");
    process.exit(failed > 0 ? 1 : 0);
  }

  ok(`User A created (${a.userId.slice(0, 8)}…)`);
  ok(`User B created (${b.userId.slice(0, 8)}…)`);

  await testProfilesCRUD(a.userId, a.client);
  await testProfilesRLSIsolation(a.userId, a.client, b.userId, b.client);
  await testUserEntitlements(a.userId, a.client);
  await testUserModuleProgress(a.userId, a.client);
  await cleanup(a.client, a.userId, b.client, b.userId);

  console.log(`\n══ Results: ${passed} passed, ${failed} failed ══`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
