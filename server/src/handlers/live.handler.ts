import { Server, Socket } from "socket.io";
import { createLiveTranscription } from "../services/deepgram.service.js";
import { textToSpeech, polishText } from "../services/elevenlabs.service.js";
import { getOpenAI } from "../services/openai.service.js";

export function registerLiveHandlers(io: Server, socket: Socket) {
  let deepgramConnection: ReturnType<typeof createLiveTranscription> | null =
    null;

  // Speech-to-Text: start listening
  socket.on("live:start-listening", () => {
    if (deepgramConnection) {
      deepgramConnection.close();
    }

    deepgramConnection = createLiveTranscription(
      (text, isFinal) => {
        socket.emit("live:transcript", { text, isFinal });
      },
      (error) => {
        socket.emit("live:error", { message: error.message });
      }
    );
  });

  // Speech-to-Text: audio chunks from client mic
  socket.on("live:audio-in", (data: Buffer) => {
    if (deepgramConnection) {
      deepgramConnection.send(data);
    }
  });

  // Speech-to-Text: stop listening
  socket.on("live:stop-listening", () => {
    if (deepgramConnection) {
      deepgramConnection.close();
      deepgramConnection = null;
    }
  });

  // Sign-to-Speech: text → polish → TTS
  socket.on("live:sign-text", async (data: { text: string }) => {
    try {
      const polished = await polishText(data.text);
      socket.emit("live:polished-preview", { polished });

      const audioBuffer = await textToSpeech(polished);
      socket.emit("live:audio-chunk", {
        audio: audioBuffer.toString("base64"),
        mimeType: "audio/mpeg",
      });
    } catch (error) {
      console.error("Sign-to-speech error:", error);
      socket.emit("live:error", { message: "Failed to convert text to speech" });
    }
  });

  // Quick phrases → direct to TTS (no polish)
  socket.on("live:quick-phrase", async (data: { text: string }) => {
    try {
      const audioBuffer = await textToSpeech(data.text);
      socket.emit("live:audio-chunk", {
        audio: audioBuffer.toString("base64"),
        mimeType: "audio/mpeg",
      });
    } catch (error) {
      console.error("Quick phrase TTS error:", error);
      socket.emit("live:error", { message: "Failed to speak phrase" });
    }
  });

  // AI suggestion after transcript
  socket.on("live:suggest", async (data: { transcript: string }) => {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are helping a deaf person in a job interview. Given what the interviewer just said, suggest a brief response hint (max 10 words). Return only the suggestion.",
          },
          { role: "user", content: data.transcript },
        ],
        temperature: 0.5,
        max_tokens: 30,
      });
      const hint = response.choices[0].message.content || "";
      socket.emit("live:suggestion", { hint });
    } catch (error) {
      console.error("AI suggestion error:", error);
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    if (deepgramConnection) {
      deepgramConnection.close();
      deepgramConnection = null;
    }
  });
}
