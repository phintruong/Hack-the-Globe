import { Server, Socket } from "socket.io";
import { evaluateAnswer } from "../services/openai.service.js";
import { getKnowledgeGraphContext } from "./profile.handler.js";

export function registerTrainingHandlers(io: Server, socket: Socket) {
  socket.on(
    "training:submit",
    async (data: { question: string; answer: string; userId?: string }) => {
      try {
        console.log(`Training submission from ${socket.id}`);

        // Pull personalized context from knowledge graph if user has a profile
        const profileContext = data.userId
          ? getKnowledgeGraphContext(data.userId)
          : null;

        const feedback = await evaluateAnswer(
          data.question,
          data.answer,
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
