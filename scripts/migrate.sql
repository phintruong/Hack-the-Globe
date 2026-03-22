-- UniVoice Feature Expansion Migration
-- Run this in the Supabase SQL editor

-- profiles: user resume + knowledge graph
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  resume_text TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  knowledge_graph JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- modules: replaces hardcoded MODULES array
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- module_questions: replaces hardcoded questions
CREATE TABLE IF NOT EXISTS module_questions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  tip TEXT,
  question_type TEXT NOT NULL DEFAULT 'behavioral'
    CHECK (question_type IN ('behavioral','technical','puzzle','resume_based','follow_up','intro')),
  sort_order INT NOT NULL DEFAULT 0
);

-- module_translations: cached bilingual content
-- question_id is '' (empty string) for module-level fields (title, description)
CREATE TABLE IF NOT EXISTS module_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL,
  field TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, question_id, locale, field)
);

-- user_module_progress: replaces localStorage
CREATE TABLE IF NOT EXISTS user_module_progress (
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES module_questions(id) ON DELETE CASCADE,
  best_score INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- interview_sessions: live + training session tracking
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('training','live')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- transcript_segments: only final segments persisted
CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user','interviewer','system')),
  text TEXT NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT true,
  segment_index INT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  locale TEXT DEFAULT 'en',
  translated_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_entitlements: free/premium gating
CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_questions_module_id ON module_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_translations_module_id ON module_translations(module_id);
CREATE INDEX IF NOT EXISTS idx_module_translations_locale ON module_translations(locale);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_session_id ON transcript_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_segment_index ON transcript_segments(session_id, segment_index);

-- RLS Policies
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Public read on modules and questions (premium gating enforced by app logic)
CREATE POLICY "modules_public_read" ON modules FOR SELECT USING (true);
CREATE POLICY "module_questions_public_read" ON module_questions FOR SELECT USING (true);
CREATE POLICY "module_translations_public_read" ON module_translations FOR SELECT USING (true);

-- Users can read/write their own progress
CREATE POLICY "user_module_progress_own" ON user_module_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can read/write their own sessions
CREATE POLICY "interview_sessions_own" ON interview_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can read/write segments in their own sessions
CREATE POLICY "transcript_segments_own" ON transcript_segments
  FOR ALL USING (
    session_id IN (
      SELECT id FROM interview_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can read their own entitlement
CREATE POLICY "user_entitlements_own_read" ON user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Role grants (required for PostgREST schema cache)
GRANT SELECT ON modules TO anon, authenticated;
GRANT SELECT ON module_questions TO anon, authenticated;
GRANT SELECT ON module_translations TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_module_progress TO authenticated;
GRANT ALL ON interview_sessions TO authenticated;
GRANT ALL ON transcript_segments TO authenticated;
GRANT ALL ON user_entitlements TO authenticated;

-- =====================
-- SEED DATA
-- =====================

INSERT INTO modules (id, title, description, sort_order, is_premium) VALUES
  ('behavioral-basics', 'Behavioral Basics', 'Foundational behavioral interview questions', 1, false),
  ('star-method', 'STAR Method', 'Practice structuring answers with Situation, Task, Action, Result', 2, false),
  ('common-questions', 'Common Questions', 'The questions you will hear in almost every interview', 3, false),
  ('advanced-answers', 'Advanced Answers', 'Challenging questions that require deeper reflection', 4, false),
  ('puzzle-estimation', 'Puzzle & Estimation', 'Fermi estimates, logic, and problem structuring questions', 5, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO module_questions (id, module_id, prompt, question_type, sort_order) VALUES
  ('bb-1', 'behavioral-basics', 'Tell me about a time you overcame a difficult challenge at work.', 'behavioral', 1),
  ('bb-2', 'behavioral-basics', 'Describe a situation where you had to work with a difficult team member.', 'behavioral', 2),
  ('bb-3', 'behavioral-basics', 'Tell me about a conflict you resolved in a team setting.', 'behavioral', 3),
  ('sm-1', 'star-method', 'Give an example of a goal you set and how you achieved it.', 'behavioral', 1),
  ('sm-2', 'star-method', 'Describe a time you went above and beyond for a project or client.', 'behavioral', 2),
  ('cq-1', 'common-questions', 'Tell me about a time you had to learn something new quickly.', 'behavioral', 1),
  ('cq-2', 'common-questions', 'Give an example of how you prioritized multiple competing deadlines.', 'behavioral', 2),
  ('cq-3', 'common-questions', 'Tell me about a time you received critical feedback and how you handled it.', 'behavioral', 3),
  ('aa-1', 'advanced-answers', 'Describe a situation where you had to make a decision with incomplete information.', 'behavioral', 1),
  ('aa-2', 'advanced-answers', 'Give an example of a time you failed and what you learned from it.', 'behavioral', 2),
  ('pe-1', 'puzzle-estimation', 'How many piano tuners are there in Chicago?', 'puzzle', 1),
  ('pe-2', 'puzzle-estimation', 'How would you estimate the number of gas stations in the United States?', 'puzzle', 2),
  ('pe-3', 'puzzle-estimation', 'You have 8 balls, one of which is slightly heavier. Using a balance scale, what is the minimum number of weighings needed to find it?', 'puzzle', 3),
  ('pe-4', 'puzzle-estimation', 'Design a system to detect if a user is a bot or human on a website.', 'puzzle', 4),
  ('pe-5', 'puzzle-estimation', 'How many golf balls fit in a school bus?', 'puzzle', 5)
ON CONFLICT (id) DO NOTHING;
