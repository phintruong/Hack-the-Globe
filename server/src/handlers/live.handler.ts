import { Server, Socket } from "socket.io";
import { createLiveTranscription } from "../services/deepgram.service.js";
import { textToSpeech, polishText } from "../services/elevenlabs.service.js";
import { getOpenAI } from "../services/openai.service.js";

export function registerLiveHandlers(io: Server, socket: Socket) {
  let deepgramConnection: ReturnType<typeof createLiveTranscription> | null =
    null;
  let resumeContext = "";

  // Speech-to-Text: start listening
  socket.on("live:start-listening", () => {
    if (deepgramConnection) {
      deepgramConnection.close();
    }

    deepgramConnection = createLiveTranscription(
      (text, isFinal) => {
        socket.emit("live:transcript", { text, isFinal });

        // Auto-trigger suggestions on final transcript
        if (isFinal && text.trim().length > 5) {
          generateSuggestions(text, socket);
        }
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

  // Select AI option → skip polish, direct to TTS
  socket.on(
    "live:select-option",
    async (data: { label: string; text: string }) => {
      try {
        socket.emit("live:selection-ack", { label: data.label });
        const audioBuffer = await textToSpeech(data.text);
        socket.emit("live:audio-chunk", {
          audio: audioBuffer.toString("base64"),
          mimeType: "audio/mpeg",
        });
      } catch (error) {
        console.error("Select option TTS error:", error);
        socket.emit("live:error", { message: "Failed to speak selection" });
      }
    }
  );

  // Store resume context for AI suggestions
  socket.on("live:set-resume", (data: { resume: string }) => {
    resumeContext = data.resume.slice(0, 4000); // cap to avoid token overflow
  });

  // Shared suggestion generator
  async function generateSuggestions(transcript: string, sock: Socket) {
    try {
      const resumeBlock = resumeContext
        ? `\nResume: ${resumeContext.slice(0, 2000)}`
        : "";

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Help a deaf job candidate respond. Generate 4 options (A-D) for the interviewer's statement. A=short/direct, B=detailed, C=clarification, D=pivot/context.${resumeBlock}
Return ONLY JSON: [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}]`,
          },
          { role: "user", content: transcript },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const raw = response.choices[0].message.content || "[]";
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const options = JSON.parse(cleaned) as { label: string; text: string }[];
      sock.emit("live:suggestions", { options });
    } catch (error) {
      console.error("AI suggestion error:", error);
      try {
        const response = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Help a deaf job candidate. Suggest 1 brief response (max 10 words). Return only the text.",
            },
            { role: "user", content: transcript },
          ],
          temperature: 0.5,
          max_tokens: 30,
        });
        const hint = response.choices[0].message.content || "";
        sock.emit("live:suggestions", {
          options: [{ label: "A", text: hint }],
        });
      } catch {
        // silent fail
      }
    }
  }

  // AI response options — manual request
  socket.on("live:suggest", async (data: { transcript: string }) => {
    await generateSuggestions(data.transcript, socket);
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    if (deepgramConnection) {
      deepgramConnection.close();
      deepgramConnection = null;
    }
  });
}
