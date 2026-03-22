import { getSupabase } from "../lib/supabase.js";
import type { TranscriptSegment } from "../types/index.js";

export async function createSession(
  userId: string,
  sessionType: "training" | "live",
  metadata?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("interview_sessions")
    .insert({
      user_id: userId,
      session_type: sessionType,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`);
  }
  return data.id as string;
}

export async function endSession(sessionId: string): Promise<void> {
  await getSupabase()
    .from("interview_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function appendSegment(
  sessionId: string,
  speaker: "user" | "interviewer" | "system",
  text: string,
  segmentIndex: number,
  timestampMs: number,
  locale = "en"
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("transcript_segments")
    .insert({
      session_id: sessionId,
      speaker,
      text,
      is_final: true,
      segment_index: segmentIndex,
      timestamp_ms: timestampMs,
      locale,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to append segment: ${error?.message}`);
  }
  return data.id as string;
}

export async function getSessionTranscript(
  sessionId: string
): Promise<TranscriptSegment[]> {
  const { data, error } = await getSupabase()
    .from("transcript_segments")
    .select("*")
    .eq("session_id", sessionId)
    .order("segment_index");

  if (error) {
    throw new Error(`Failed to fetch transcript: ${error.message}`);
  }
  return (data ?? []) as TranscriptSegment[];
}

export async function translateSegment(
  segmentId: string,
  translatedText: string
): Promise<void> {
  await getSupabase()
    .from("transcript_segments")
    .update({ translated_text: translatedText })
    .eq("id", segmentId);
}
