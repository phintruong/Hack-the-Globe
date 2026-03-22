import { createHash } from "crypto";
import { Server, Socket } from "socket.io";
import { evaluateByType } from "../services/openai.service.js";
import { getProfile } from "../services/profile.service.js";
import { getRelevantKGContext } from "../services/kg-retrieval.service.js";
import { getSupabase } from "../lib/supabase.js";
import type { QuestionType } from "../types/index.js";
import type { KnowledgeGraph } from "../services/knowledge-graph.service.js";

function computeAvgScore(feedback: { type: string; data: unknown }): number {
  const d = feedback.data as Record<string, number>;
  if (feedback.type === "puzzle") {
    const vals = [d.reasoning_clarity, d.structure, d.assumptions, d.communication];
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const vals = [d.situation, d.task, d.action, d.result];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function registerTrainingHandlers(io: Server, socket: Socket) {
  socket.on(
    "training:submit",
    async (data: {
      question: string;
      answer: string;
      userId?: string;
      questionType?: QuestionType;
      moduleId?: string;
      questionId?: string;
    }) => {
      try {
        console.log(`Training submission from ${socket.id}`);

        const questionType: QuestionType = data.questionType ?? "behavioral";

        // Fetch profile and get type-filtered KG context
        let profileContext: string | null = null;
        if (data.userId) {
          const profile = await getProfile(data.userId);
          if (profile?.knowledgeGraph) {
            profileContext = getRelevantKGContext(
              profile.knowledgeGraph as KnowledgeGraph,
              questionType,
              data.question
            );
          }
        }

        const feedback = await evaluateByType(
          data.question,
          data.answer,
          questionType,
          profileContext
        );

        socket.emit("training:feedback", { success: true, feedback });

        // Persist answer + feedback (best-effort, never blocks feedback delivery)
        if (data.userId && data.moduleId && data.questionId) {
          try {
            const hash = createHash("sha256")
              .update(`${data.userId}:${data.questionId}:${data.answer}`)
              .digest("hex");

            const sb = getSupabase();

            // Insert answer with dedup
            await sb.from("user_question_answers").upsert(
              {
                user_id: data.userId,
                question_id: data.questionId,
                module_id: data.moduleId,
                answer_text: data.answer,
                question_prompt: data.question,
                question_type: questionType,
                feedback_json: feedback.data,
                score: computeAvgScore(feedback),
                submission_hash: hash,
              },
              { onConflict: "submission_hash" }
            );

            // Invalidate cached report for this module
            await sb
              .from("module_reports")
              .delete()
              .eq("user_id", data.userId)
              .eq("module_id", data.moduleId);
          } catch (persistErr) {
            console.error("Failed to persist answer (non-blocking):", persistErr);
          }
        }
      } catch (error) {
        console.error("Training evaluation error:", error);
        socket.emit("training:feedback", {
          success: false,
          error: "Failed to evaluate answer. Please try again.",
        });
      }
    }
  );
}
