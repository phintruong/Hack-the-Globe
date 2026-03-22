// Shared types for VIBE server

export type QuestionType =
  | "behavioral"
  | "technical"
  | "puzzle"
  | "resume_based"
  | "follow_up"
  | "intro";

export interface STARFeedback {
  situation: number;
  task: number;
  action: number;
  result: number;
  improvements: string[];
  polishedAnswer: string;
}

export interface PuzzleFeedback {
  reasoning_clarity: number;
  structure: number;
  assumptions: number;
  communication: number;
  improvements: string[];
  polishedAnswer: string;
}

export type AnswerFeedback =
  | { type: "behavioral"; data: STARFeedback }
  | { type: "puzzle"; data: PuzzleFeedback };

export interface DbModule {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_premium: boolean;
  created_at: string;
}

export interface DbQuestion {
  id: string;
  module_id: string;
  prompt: string;
  tip?: string;
  question_type: QuestionType;
  sort_order: number;
}

// ── Puzzle Builder types ──

export type BlockCategory = "skill" | "action" | "metric" | "context" | "experience";

export interface PuzzleBlock {
  id: string;
  text: string;
  category: BlockCategory;
}

export interface ExperienceOption {
  label: "A" | "B" | "C" | "D";
  title: string;
  description: string;
}

export interface StitchSegment {
  type: "block" | "filler";
  text: string;
  blockId?: string;
}

export interface PuzzleError {
  event: "generate-options" | "generate-blocks" | "stitch";
  message: string;
  fallbackUsed: boolean;
}

export interface ModuleReport {
  moduleId: string;
  moduleTitle: string;
  questionCount: number;
  dimensionAnalysis: {
    dimension: string;
    average: number;
    verdict: "strong" | "moderate" | "needs-work";
  }[];
  kgSuggestions: {
    questionType: string;
    suggestion: string;
    referencedExperience: string;
  }[];
  coachingTips: string[];
  overallSummary: string;
  strongestArea: string;
  weakestArea: string;
  answers: {
    questionId: string;
    questionPrompt: string;
    answerText: string;
    score: number;
    feedbackJson: STARFeedback | PuzzleFeedback;
  }[];
  cached: boolean;
}

// ── Transcript types ──


export interface TranscriptSegment {
  id: string;
  session_id: string;
  speaker: "user" | "interviewer" | "system";
  text: string;
  is_final: boolean;
  segment_index: number;
  timestamp_ms: number;
  locale: string;
  translated_text?: string;
  created_at: string;
}
