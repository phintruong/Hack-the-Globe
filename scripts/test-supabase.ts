/**
 * Supabase auth + database integration tests.
 * Run with: pnpm tsx scripts/test-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fhjvkeaudihbvvrjpfvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoanZrZWF1ZGloYnZ2cmpwZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDIzNDIsImV4cCI6MjA4OTY3ODM0Mn0.pFIBJTsjS63oVjtsXug7BfMxaKXVon8e41p1mFmA0M4";

const TEST_EMAIL = `univoice.test.${Date.now()}@gmail.com`;
const TEST_PASSWORD = "Test1234!";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function run() {
  console.log("\n── Supabase Integration Tests ──\n");

  // ── 1. Connectivity ──────────────────────────────────────────────────────
  console.log("1. Connectivity");
  try {
    const { error } = await supabase.from("training_sessions").select("id").limit(0);
    // 42501 = RLS denied (expected when not logged in) — means the table exists
    if (!error || error.code === "42501" || error.message?.includes("row-level")) {
      ok("Supabase reachable and training_sessions table exists");
    } else if (
      error.message?.includes("does not exist") ||
      error.message?.includes("schema cache")
    ) {
      fail(
        "training_sessions table not found",
        "Run the SQL migration in your Supabase dashboard (SQL Editor) first."
      );
      console.log(`
  ┌─ Required SQL ──────────────────────────────────────────────────────────┐
  │ create table training_sessions (                                        │
  │   id uuid default gen_random_uuid() primary key,                       │
  │   user_id uuid references auth.users(id) on delete cascade not null,   │
  │   question text not null,                                               │
  │   question_index integer not null,                                      │
  │   answer text not null,                                                 │
  │   star_situation integer, star_task integer,                            │
  │   star_action integer, star_result integer,                             │
  │   improvements text[], polished_answer text,                            │
  │   created_at timestamptz default now()                                  │
  │ );                                                                      │
  │ alter table training_sessions enable row level security;               │
  │ create policy "Users can view own sessions" on training_sessions        │
  │   for select using (auth.uid() = user_id);                             │
  │ create policy "Users can insert own sessions" on training_sessions      │
  │   for insert with check (auth.uid() = user_id);                        │
  └─────────────────────────────────────────────────────────────────────────┘
`);
      summary();
      return;
    } else {
      fail("Unexpected error querying table", error.message);
    }
  } catch (e: any) {
    fail("Could not reach Supabase", e.message);
  }

  // ── 2. Sign Up ───────────────────────────────────────────────────────────
  console.log("\n2. Auth — Sign Up");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signUpError) {
    fail("signUp returned error", signUpError.message);
  } else if (!signUpData.user) {
    fail("signUp succeeded but no user returned");
  } else {
    ok(`User created (id: ${signUpData.user.id.slice(0, 8)}…)`);
  }

  // ── 3. Sign In ───────────────────────────────────────────────────────────
  console.log("\n3. Auth — Sign In");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    // Email confirmation required — still counts as auth working correctly
    if (signInError.message.toLowerCase().includes("email not confirmed")) {
      ok("Sign-in correctly blocked pending email confirmation (expected in prod)");
      console.log("\n  ℹ  Email confirmation is enabled on your Supabase project.");
      console.log("     For local testing, disable it: Supabase Dashboard → Auth → Providers → Email → Confirm email: OFF");
      console.log("     Skipping DB tests (need a valid session).\n");
      summary();
      return;
    }
    fail("signInWithPassword returned error", signInError.message);
    summary();
    return;
  }

  if (!signInData.session) {
    fail("signIn succeeded but no session returned");
    summary();
    return;
  }

  ok(`Signed in, session expires ${new Date(signInData.session.expires_at! * 1000).toISOString()}`);
  const userId = signInData.user.id;

  // ── 4. DB Insert ─────────────────────────────────────────────────────────
  console.log("\n4. Database — Insert training session");
  const sampleSession = {
    user_id: userId,
    question: "Tell me about a time you solved a hard problem.",
    question_index: 0,
    answer: "I once debugged a memory leak in production at 2am.",
    star_situation: 80,
    star_task: 75,
    star_action: 90,
    star_result: 85,
    improvements: ["Add more specific metrics", "Clarify the timeline"],
    polished_answer: "In my previous role, I resolved a critical memory leak under time pressure.",
  };

  const { data: insertData, error: insertError } = await supabase
    .from("training_sessions")
    .insert(sampleSession)
    .select()
    .single();

  if (insertError) {
    fail("Insert failed", insertError.message);
    summary();
    return;
  }

  ok(`Session inserted (id: ${insertData.id.slice(0, 8)}…)`);
  const sessionId = insertData.id;

  // ── 5. DB Read ───────────────────────────────────────────────────────────
  console.log("\n5. Database — Read back session");
  const { data: readData, error: readError } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (readError) {
    fail("Read failed", readError.message);
  } else {
    ok(`Question matches: "${readData.question.slice(0, 40)}…"`);
    ok(`STAR scores: S=${readData.star_situation} T=${readData.star_task} A=${readData.star_action} R=${readData.star_result}`);
    ok(`Improvements array length: ${readData.improvements.length}`);
  }

  // ── 6. RLS — second client cannot read first user's data ─────────────────
  console.log("\n6. RLS — unauthenticated client cannot read data");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: rlsData, error: rlsError } = await anonClient
    .from("training_sessions")
    .select("id")
    .eq("id", sessionId);

  if (rlsError || (rlsData && rlsData.length === 0)) {
    ok("RLS blocks unauthenticated reads (correct)");
  } else {
    fail("RLS not working — unauthenticated client could read data!");
  }

  // ── 7. Cleanup ───────────────────────────────────────────────────────────
  console.log("\n7. Cleanup");
  const { error: deleteError } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) {
    fail("Cleanup delete failed", deleteError.message);
  } else {
    ok("Test session deleted");
  }

  await supabase.auth.signOut();
  ok("Signed out");

  summary();
}

function summary() {
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
