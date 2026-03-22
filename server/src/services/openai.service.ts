import OpenAI from "openai";
import type { QuestionType, STARFeedback, PuzzleFeedback, AnswerFeedback } from "../types/index.js";

export type { STARFeedback, PuzzleFeedback, AnswerFeedback };

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

const STAR_PROMPT = `You are an interview coach evaluating answers using the STAR method.

Rate each component 0-100:
- Situation: Did the candidate set the scene clearly?
- Task: Did they explain what they needed to accomplish?
- Action: Did they describe specific actions they took?
- Result: Did they share measurable outcomes?

Also provide:
- 2-3 specific improvements
- A polished version of their answer

If candidate profile context is provided, use it to:
- Give personalized suggestions that reference their actual skills and experiences
- Suggest they draw from specific past roles or projects when their answer is generic
- Tailor the polished answer to highlight their real strengths

Respond in this exact JSON format:
{
  "situation": <number>,
  "task": <number>,
  "action": <number>,
  "result": <number>,
  "improvements": ["<improvement1>", "<improvement2>"],
  "polishedAnswer": "<polished version>"
}`;

const POLISH_PROMPT = `You are a professional interview coach. Polish the following interview answer to be more articulate and professional while preserving the candidate's original meaning and personality. Keep it concise. Return only the polished text, nothing else.`;

export async function evaluateAnswer(
  question: string,
  answer: string,
  profileContext?: string | null
): Promise<STARFeedback> {
  const profileBlock = profileContext
    ? `\n\nCandidate Profile:\n${profileContext}`
    : "";

  const [starResult, polishResult] = await Promise.all([
    getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: STAR_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}${profileBlock}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
    getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: POLISH_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}${profileBlock}`,
        },
      ],
      temperature: 0.5,
    }),
  ]);

  const starData = JSON.parse(
    starResult.choices[0].message.content || "{}"
  );

  return {
    situation: starData.situation ?? 0,
    task: starData.task ?? 0,
    action: starData.action ?? 0,
    result: starData.result ?? 0,
    improvements: starData.improvements ?? [],
    polishedAnswer:
      polishResult.choices[0].message.content || answer,
  };
}

const PUZZLE_PROMPT = `You are an interview coach evaluating a candidate's answer to a puzzle or estimation question.

Rate each dimension 0-100:
- reasoning_clarity: Is their thought process logical and easy to follow?
- structure: Did they break the problem into manageable parts?
- assumptions: Did they state assumptions clearly and reasonably?
- communication: Did they explain their thinking in a clear, confident way?

Also provide:
- 2-3 specific improvements
- A polished version of their answer that demonstrates strong structured reasoning

If candidate profile context is provided, reference relevant strengths or experience where appropriate.

Respond in this exact JSON format:
{
  "reasoning_clarity": <number>,
  "structure": <number>,
  "assumptions": <number>,
  "communication": <number>,
  "improvements": ["<improvement1>", "<improvement2>"],
  "polishedAnswer": "<polished version>"
}`;

export async function evaluatePuzzleAnswer(
  question: string,
  answer: string,
  profileContext?: string | null
): Promise<PuzzleFeedback> {
  const profileBlock = profileContext
    ? `\n\nCandidate Profile:\n${profileContext}`
    : "";

  const [puzzleResult, polishResult] = await Promise.all([
    getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PUZZLE_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}${profileBlock}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
    getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: POLISH_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer: ${answer}${profileBlock}`,
        },
      ],
      temperature: 0.5,
    }),
  ]);

  const data = JSON.parse(puzzleResult.choices[0].message.content || "{}");

  return {
    reasoning_clarity: data.reasoning_clarity ?? 0,
    structure: data.structure ?? 0,
    assumptions: data.assumptions ?? 0,
    communication: data.communication ?? 0,
    improvements: data.improvements ?? [],
    polishedAnswer: polishResult.choices[0].message.content || answer,
  };
}

export async function evaluateByType(
  question: string,
  answer: string,
  questionType: QuestionType,
  profileContext?: string | null
): Promise<AnswerFeedback> {
  if (questionType === "puzzle") {
    const data = await evaluatePuzzleAnswer(question, answer, profileContext);
    return { type: "puzzle", data };
  }
  const data = await evaluateAnswer(question, answer, profileContext);
  return { type: "behavioral", data };
}
