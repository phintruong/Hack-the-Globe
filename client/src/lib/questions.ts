import type { QuestionType } from "@/types/index";

export interface Question {
  id: string;
  prompt: string;
  tip?: string;
  question_type?: QuestionType;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  is_premium?: boolean;
  questions: Question[];
}

export const MODULES: Module[] = [
  {
    id: "behavioral-basics",
    title: "Behavioral Basics",
    description: "Foundational behavioral interview questions",
    questions: [
      { id: "bb-1", prompt: "Tell me about a time you overcame a difficult challenge at work." },
      { id: "bb-2", prompt: "Describe a situation where you had to work with a difficult team member." },
      { id: "bb-3", prompt: "Tell me about a conflict you resolved in a team setting." },
    ],
  },
  {
    id: "star-method",
    title: "STAR Method",
    description: "Practice structuring answers with Situation, Task, Action, Result",
    questions: [
      { id: "sm-1", prompt: "Give an example of a goal you set and how you achieved it." },
      { id: "sm-2", prompt: "Describe a time you went above and beyond for a project or client." },
    ],
  },
  {
    id: "common-questions",
    title: "Common Questions",
    description: "The questions you will hear in almost every interview",
    questions: [
      { id: "cq-1", prompt: "Tell me about a time you had to learn something new quickly." },
      { id: "cq-2", prompt: "Give an example of how you prioritized multiple competing deadlines." },
      { id: "cq-3", prompt: "Tell me about a time you received critical feedback and how you handled it." },
    ],
  },
  {
    id: "advanced-answers",
    title: "Advanced Answers",
    description: "Challenging questions that require deeper reflection",
    questions: [
      { id: "aa-1", prompt: "Describe a situation where you had to make a decision with incomplete information." },
      { id: "aa-2", prompt: "Give an example of a time you failed and what you learned from it." },
    ],
  },
];

// Backward compat: flat list of all prompts
export const INTERVIEW_QUESTIONS = MODULES.flatMap((m) =>
  m.questions.map((q) => q.prompt)
);
