-- Disable RLS on all tables for development
-- Run this in the Supabase SQL editor to bypass all row-level security

ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS module_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS module_translations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_module_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interview_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transcript_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_entitlements DISABLE ROW LEVEL SECURITY;

-- Allow anon role full access (needed when using anon key without service role)
GRANT ALL ON profiles TO anon;
GRANT ALL ON user_module_progress TO anon;
GRANT ALL ON interview_sessions TO anon;
GRANT ALL ON transcript_segments TO anon;
GRANT ALL ON user_entitlements TO anon;
