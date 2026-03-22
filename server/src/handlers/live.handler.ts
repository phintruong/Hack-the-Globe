import { Server, Socket } from "socket.io";
import { createLiveTranscription } from "../services/deepgram.service.js";
import { textToSpeech, polishText } from "../services/elevenlabs.service.js";
import { getOpenAI } from "../services/openai.service.js";
import {
  createSession,
  endSession,
  appendSegment,
  getSessionTranscript,
  translateSegment,
} from "../services/session.service.js";
import { translateText } from "../services/translation.service.js";

type TranscriptionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

const MAX_RETRIES = 5;

export function registerLiveHandlers(io: Server, socket: Socket) {
  let deepgramConnection: ReturnType<typeof createLiveTranscription> | null = null;
  let resumeContext = "";
  let sessionId: string | null = null;
  let sessionStartTime = 0;
  let segmentIndex = 0;
  let currentUserId: string | null = null;

  // STT state machine
  let sttState: TranscriptionState = "idle";
  let listeningActive = false;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectionGeneration = 0;

  // Observability
  let droppedChunks = 0;
  let connectStartTime = 0;

  function setState(newState: TranscriptionState) {
    console.info(`[stt] ${sttState} → ${newState}`);
    sttState = newState;
    socket.emit("live:stt-state", { state: newState });
  }

  function teardownSTT() {
    listeningActive = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    connectionGeneration++; // invalidate all pending callbacks
    if (deepgramConnection) {
      deepgramConnection.close();
      deepgramConnection = null;
    }
    reconnectAttempts = 0;
    droppedChunks = 0;
    setState("idle");
  }

  function reconnectDeepgram() {
    const gen = ++connectionGeneration;
    connectStartTime = Date.now();

    // Close previous connection if any
    if (deepgramConnection) {
      deepgramConnection.close();
      deepgramConnection = null;
    }

    setState("connecting");

    deepgramConnection = createLiveTranscription(
      // onTranscript
      async (text, isFinal) => {
        if (gen !== connectionGeneration) return;
        socket.emit("live:transcript", { text, isFinal });

        // Persist final segments to DB
        if (isFinal && text.trim().length > 0 && sessionId) {
          try {
            const segId = await appendSegment(
              sessionId,
              "interviewer",
              text,
              segmentIndex++,
              Date.now() - sessionStartTime
            );
            socket.emit("live:segment-persisted", {
              segmentId: segId,
              segmentIndex: segmentIndex - 1,
            });
          } catch (err) {
            console.error("appendSegment error:", err);
          }
        }

        // Auto-trigger suggestions on final transcript
        if (isFinal && text.trim().length > 5) {
          generateSuggestions(text, socket);
        }
      },
      // onError
      (error) => {
        if (gen !== connectionGeneration) return;
        console.error(`[stt] deepgram error (gen=${gen}):`, error.message);
        socket.emit("live:error", { message: error.message });
      },
      // onClose
      () => {
        if (gen !== connectionGeneration) return;
        if (!listeningActive) return;

        if (reconnectAttempts >= MAX_RETRIES) {
          setState("failed");
          console.error(`[stt] gave up after ${MAX_RETRIES} retries`);
          return;
        }

        setState("reconnecting");
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
        console.info(
          `[stt] reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RETRIES})`
        );
        reconnectAttempts++;
        reconnectTimer = setTimeout(() => {
          if (gen === connectionGeneration - 1) return; // generation changed during wait
          reconnectDeepgram();
        }, delay);
      },
      // onOpen
      () => {
        if (gen !== connectionGeneration) return;
        const latency = Date.now() - connectStartTime;
        if (reconnectAttempts > 0) {
          console.info(
            `[stt] reconnected in ${latency}ms after ${reconnectAttempts} attempt(s), dropped ${droppedChunks} chunks`
          );
        } else {
          console.info(`[stt] connected in ${latency}ms`);
        }
        reconnectAttempts = 0;
        droppedChunks = 0;
        setState("connected");
      }
    );
  }

  // Session lifecycle: start
  socket.on(
    "live:session-start",
    async (data: { userId: string; metadata?: Record<string, unknown> }) => {
      try {
        currentUserId = data.userId;
        sessionId = await createSession(data.userId, "live", data.metadata);
        sessionStartTime = Date.now();
        segmentIndex = 0;
        socket.emit("live:session-started", { sessionId });
      } catch (err) {
        console.error("session-start error:", err);
        socket.emit("live:error", { message: "Failed to start session" });
      }
    }
  );

  // Session lifecycle: end
  socket.on("live:session-end", async () => {
    if (sessionId) {
      try {
        await endSession(sessionId);
        socket.emit("live:session-ended", {});
      } catch (err) {
        console.error("session-end error:", err);
      }
    }
  });

  // Session lifecycle: resume
  socket.on("live:session-resume", async (data: { sessionId: string }) => {
    try {
      sessionId = data.sessionId;
      const segments = await getSessionTranscript(data.sessionId);
      segmentIndex = segments.length;
      sessionStartTime = Date.now();
      socket.emit("live:session-resumed", {
        sessionId: data.sessionId,
        segments,
      });
    } catch (err) {
      console.error("session-resume error:", err);
      socket.emit("live:error", { message: "Failed to resume session" });
    }
  });

  // Speech-to-Text: start listening
  socket.on("live:start-listening", () => {
    listeningActive = true;
    reconnectAttempts = 0;
    reconnectDeepgram();
  });

  // Speech-to-Text: audio chunks from client mic
  socket.on("live:audio-in", (data: Buffer) => {
    if (deepgramConnection?.isOpen()) {
      deepgramConnection.send(data);
    } else if (listeningActive) {
      droppedChunks++;
    }
  });

  // Speech-to-Text: stop listening
  socket.on("live:stop-listening", () => {
    teardownSTT();
  });

  // Sign-to-Speech: text → polish → TTS
  socket.on("live:sign-text", async (data: { text: string }) => {
    try {
      const polished = await polishText(data.text);
      socket.emit("live:polished-preview", { polished });

      // Persist user speech segment if session active
      if (sessionId) {
        try {
          await appendSegment(
            sessionId,
            "user",
            polished,
            segmentIndex++,
            Date.now() - sessionStartTime
          );
        } catch (err) {
          console.error("appendSegment (sign) error:", err);
        }
      }

      const audioBuffer = await textToSpeech(polished);
      socket.emit("live:audio-chunk", {
        audio: audioBuffer.toString("base64"),
        mimeType: "audio/mpeg",
      });
    } catch (error) {
      console.error("Sign-to-speech error:", error);
      socket.emit("live:error", {
        message: "Failed to convert text to speech",
      });
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

        if (sessionId) {
          try {
            await appendSegment(
              sessionId,
              "user",
              data.text,
              segmentIndex++,
              Date.now() - sessionStartTime
            );
          } catch (err) {
            console.error("appendSegment (option) error:", err);
          }
        }

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
    resumeContext = data.resume.slice(0, 4000);
  });

  // Translate a persisted segment on demand
  socket.on(
    "live:translate-segment",
    async (data: { segmentId: string; text: string; locale: string }) => {
      try {
        const translatedText = await translateText(data.text, data.locale);
        await translateSegment(data.segmentId, translatedText);
        socket.emit("live:segment-translated", {
          segmentId: data.segmentId,
          translatedText,
        });
      } catch (err) {
        console.error("translate-segment error:", err);
        socket.emit("live:error", { message: "Translation failed" });
      }
    }
  );

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
      const cleaned = raw
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
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
    teardownSTT();
    if (sessionId) {
      endSession(sessionId).catch(() => {});
    }
  });
}
