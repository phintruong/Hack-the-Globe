import { Server, Socket } from "socket.io";
import { evaluateAnswer } from "../services/openai.service.js";

export function registerTrainingHandlers(io: Server, socket: Socket) {
  socket.on(
    "training:submit",
    async (data: { question: string; answer: string }) => {
      try {
        console.log(`Training submission from ${socket.id}`);
        const feedback = await evaluateAnswer(data.question, data.answer);
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
