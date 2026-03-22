import { Router } from "express";
import { getSupabase } from "../lib/supabase.js";
import { getOpenAI } from "../services/openai.service.js";
import { getProfile } from "./profile.handler.js";
import { knowledgeGraphToContext } from "../services/knowledge-graph.service.js";
import type { KnowledgeGraph } from "../services/knowledge-graph.service.js";
import type { ModuleReport, STARFeedback, PuzzleFeedback } from "../types/index.js";

const router = Router();

interface AnswerRow {
  id: string;
  user_id: string;
  question_id: string;
  module_id: string;
  answer_text: string;
  question_prompt: string;
  question_type: string;
  feedback_json: STARFeedback | PuzzleFeedback;
  score: number;
  created_at: string;
}

function computeDimensionAnalysis(
  answers: AnswerRow[]
): ModuleReport["dimensionAnalysis"] {
  const behavioralDims = ["situation", "task", "action", "result"] as const;
  const puzzleDims = [
    "reasoning_clarity",
    "structure",
    "assumptions",
    "communication",
  ] as const;

  const hasPuzzle = answers.some((a) => a.question_type === "puzzle");
  const dims = hasPuzzle ? puzzleDims : behavioralDims;

  return dims.map((dim) => {
    const scores = answers
      .map((a) => (a.feedback_json as unknown as Record<string, number>)[dim])
      .filter((v) => typeof v === "number");
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const verdict: "strong" | "moderate" | "needs-work" =
      avg >= 70 ? "strong" : avg >= 40 ? "moderate" : "needs-work";
    return { dimension: dim, average: avg, verdict };
  });
}

function summarizeAnswer(answer: string, maxWords = 80): string {
  const words = answer.split(/\s+/);
  if (words.length <= maxWords) return answer;
  return words.slice(0, maxWords).join(" ") + "...";
}

const REPORT_PROMPT = `You are an interview coach generating a post-module performance report.

You will receive:
1. A list of interview questions with the candidate's answers (summarized) and their per-question scores
2. Pre-computed dimension averages
3. The candidate's profile/knowledge graph (if available)

Generate a JSON report with:
- "kgSuggestions": array of {questionType, suggestion, referencedExperience}. For each question type in this module, suggest which specific experience/project from the candidate's profile they should reference. If no profile provided, return empty array.
- "coachingTips": array of 3-5 actionable improvement tips synthesized across all answers. Be specific — reference actual patterns you see.
- "overallSummary": 2-3 sentence summary of the candidate's performance across the module.
- "strongestArea": the candidate's strongest dimension or skill based on scores and answers.
- "weakestArea": the candidate's weakest dimension that needs the most improvement.

Respond ONLY with valid JSON matching this exact structure.`;

/** GET /api/report/:moduleId?userId=... */
router.get("/api/report/:moduleId", async (req, res) => {
  const startTime = Date.now();
  try {
    const { moduleId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: "userId query param is required" });
      return;
    }

    const sb = getSupabase();

    // 1. Check cache
    const { data: cached } = await sb
      .from("module_reports")
      .select("report_json")
      .eq("user_id", userId)
      .eq("module_id", moduleId)
      .single();

    if (cached?.report_json) {
      console.log(
        `Report cache hit for ${moduleId} (${Date.now() - startTime}ms)`
      );
      res.json({ ...cached.report_json, cached: true });
      return;
    }

    // 2. Fetch answers
    const { data: allAnswers, error: ansErr } = await sb
      .from("user_question_answers")
      .select("*")
      .eq("user_id", userId)
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    if (ansErr || !allAnswers || allAnswers.length === 0) {
      res.status(400).json({
        error: "No answers found for this module. Complete the module first.",
      });
      return;
    }

    // Deduplicate to latest per question
    const latestByQuestion = new Map<string, AnswerRow>();
    for (const row of allAnswers as AnswerRow[]) {
      if (!latestByQuestion.has(row.question_id)) {
        latestByQuestion.set(row.question_id, row);
      }
    }
    const answers = Array.from(latestByQuestion.values());

    // 3. Fetch module title
    const { data: modData } = await sb
      .from("modules")
      .select("title")
      .eq("id", moduleId)
      .single();
    const moduleTitle = modData?.title ?? moduleId;

    // 4. Compute dimension analysis server-side (no LLM needed)
    const dimensionAnalysis = computeDimensionAnalysis(answers);

    // 5. Fetch KG context
    let kgContext = "";
    try {
      const profile = await getProfile(userId);
      if (profile?.knowledgeGraph) {
        const fullCtx = knowledgeGraphToContext(
          profile.knowledgeGraph as KnowledgeGraph
        );
        // Cap to 1000 chars for token efficiency
        kgContext = fullCtx.slice(0, 1000);
      }
    } catch {
      // KG missing — skip suggestions
    }

    // 6. Pre-aggregate answers for the prompt
    const answerSummaries = answers.map((a) => ({
      question: a.question_prompt,
      answer: summarizeAnswer(a.answer_text),
      score: a.score,
      type: a.question_type,
    }));

    const dimSummary = dimensionAnalysis
      .map((d) => `${d.dimension}: ${d.average}/100 (${d.verdict})`)
      .join(", ");

    // 7. Call GPT-4o-mini
    let aiReport: {
      kgSuggestions: ModuleReport["kgSuggestions"];
      coachingTips: string[];
      overallSummary: string;
      strongestArea: string;
      weakestArea: string;
    };

    try {
      const result = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: REPORT_PROMPT },
          {
            role: "user",
            content: `Module: ${moduleTitle}\n\nDimension Averages: ${dimSummary}\n\nQuestions & Answers:\n${answerSummaries
              .map(
                (a, i) =>
                  `${i + 1}. Q: ${a.question}\n   A: ${a.answer}\n   Score: ${a.score}/100 (${a.type})`
              )
              .join("\n\n")}${kgContext ? `\n\nCandidate Profile:\n${kgContext}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      aiReport = JSON.parse(result.choices[0].message.content || "{}");

      const tokens = result.usage;
      console.log(
        `Report generated for ${moduleId}: ${Date.now() - startTime}ms, tokens: ${tokens?.total_tokens ?? "unknown"}`
      );
    } catch (llmErr) {
      // Fallback: analytics-only report without AI coaching
      console.error("LLM failed for report, returning analytics-only:", llmErr);
      aiReport = {
        kgSuggestions: [],
        coachingTips: [
          "Complete more practice sessions to receive personalized coaching tips.",
        ],
        overallSummary: `You completed ${answers.length} questions in ${moduleTitle}. Review your dimension scores below to identify areas for improvement.`,
        strongestArea:
          dimensionAnalysis.reduce((a, b) =>
            a.average >= b.average ? a : b
          ).dimension,
        weakestArea:
          dimensionAnalysis.reduce((a, b) =>
            a.average <= b.average ? a : b
          ).dimension,
      };
    }

    // If KG is missing, ensure kgSuggestions is empty
    if (!kgContext) {
      aiReport.kgSuggestions = [];
    }

    const report: ModuleReport = {
      moduleId,
      moduleTitle,
      questionCount: answers.length,
      dimensionAnalysis,
      kgSuggestions: aiReport.kgSuggestions ?? [],
      coachingTips: aiReport.coachingTips ?? [],
      overallSummary: aiReport.overallSummary ?? "",
      strongestArea: aiReport.strongestArea ?? "",
      weakestArea: aiReport.weakestArea ?? "",
      answers: answers.map((a) => ({
        questionId: a.question_id,
        questionPrompt: a.question_prompt,
        answerText: a.answer_text,
        score: a.score,
        feedbackJson: a.feedback_json,
      })),
      cached: false,
    };

    // 8. Cache the report
    try {
      await sb.from("module_reports").upsert(
        {
          user_id: userId,
          module_id: moduleId,
          report_json: report,
        },
        { onConflict: "user_id,module_id" }
      );
    } catch (cacheErr) {
      console.error("Failed to cache report (non-blocking):", cacheErr);
    }

    res.json(report);
  } catch (err) {
    console.error(
      `GET /api/report error (${Date.now() - startTime}ms):`,
      err
    );
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/** DELETE /api/report/:moduleId?userId=... — force regenerate */
router.delete("/api/report/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: "userId query param is required" });
      return;
    }

    await getSupabase()
      .from("module_reports")
      .delete()
      .eq("user_id", userId)
      .eq("module_id", moduleId);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/report error:", err);
    res.status(500).json({ error: "Failed to invalidate report cache" });
  }
});

export default router;
