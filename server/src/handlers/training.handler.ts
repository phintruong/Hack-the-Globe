import { Server, Socket } from "socket.io";
import { evaluateByType } from "../services/openai.service.js";
import { getProfile } from "../services/profile.service.js";
import { getRelevantKGContext } from "../services/kg-retrieval.service.js";
import type { QuestionType } from "../types/index.js";
import type { KnowledgeGraph } from "../services/knowledge-graph.service.js";

export function registerTrainingHandlers(io: Server, socket: Socket) {
  socket.on(
    "training:submit",
    async (data: {
      question: string;
      answer: string;
      userId?: string;
      questionType?: QuestionType;
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
