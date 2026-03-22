"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { WebcamFeed } from "@/components/WebcamFeed";
import { WordBuilder } from "@/components/WordBuilder";
import { OptionSelector } from "@/components/OptionSelector";
import { AslGuide } from "@/components/AslGuide";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useFingerpose } from "@/hooks/useFingerpose";
import { useLetterStabilizer } from "@/hooks/useLetterStabilizer";
import { useDrawLandmarks } from "@/components/HandLandmarkRenderer";
import { useSocket } from "@/hooks/useSocket";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { extractTextFromPdf } from "@/lib/parse-pdf";
import { ClosedCaptions } from "@/components/ClosedCaptions";

type TranscriptionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

interface ChatMessage {
  sender: "you" | "interviewer" | "system";
  text: string;
  timestamp: Date;
}

interface AiOption {
  label: string;
  text: string;
}

const QUICK_PHRASES = [
  "Yes",
  "No",
  "Could you repeat that?",
  "Thank you",
  "I need a moment",
  "Nice to meet you",
  "I understand",
  "Can you elaborate?",
  "That's a great question",
  "Let me think about that",
  "I have a question",
  "Could you speak slower?",
];

export default function LivePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { detect, ready } = useMediaPipe();
  const { estimate } = useFingerpose();
  const { stable, update } = useLetterStabilizer();
  const drawLandmarks = useDrawLandmarks();
  const { socket, connected } = useSocket();

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [listening, setListening] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [clock, setClock] = useState("");
  const [aiOptions, setAiOptions] = useState<AiOption[]>([]);
  const [resume, setResume] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeParsing, setResumeParsing] = useState(false);
  const [showResumeInput, setShowResumeInput] = useState(true);
  const [showTypeFallback, setShowTypeFallback] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const [sttState, setSttState] = useState<TranscriptionState>("idle");
  const [recentFinals, setRecentFinals] = useState<{ text: string; timestamp: number }[]>([]);
  const [lastTranscriptTime, setLastTranscriptTime] = useState(Date.now());
  const [silenceDuration, setSilenceDuration] = useState(0);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const prevConnectedRef = useRef(connected);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listenersSetup = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // TTS audio queue
  const audioQueueRef = useRef<string[]>([]);
  const audioPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playNextAudio = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      audioPlayingRef.current = false;
      return;
    }
    audioPlayingRef.current = true;
    const base64 = audioQueueRef.current.shift()!;
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    currentAudioRef.current = audio;
    audio.onended = () => {
      currentAudioRef.current = null;
      playNextAudio();
    };
    audio.onerror = () => {
      currentAudioRef.current = null;
      playNextAudio();
    };
    audio.play().catch(() => playNextAudio());
  }, []);

  const enqueueAudio = useCallback(
    (base64: string) => {
      // Cancel current audio if playing — new selection takes priority
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      audioQueueRef.current = [base64]; // replace queue
      audioPlayingRef.current = false;
      playNextAudio();
    },
    [playNextAudio]
  );

  // Live clock
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, interimText]);

  // Silence duration tracker
  useEffect(() => {
    const id = setInterval(() => {
      setSilenceDuration(Date.now() - lastTranscriptTime);
    }, 1000);
    return () => clearInterval(id);
  }, [lastTranscriptTime]);

  // Prune old finals (older than 10s)
  useEffect(() => {
    const id = setInterval(() => {
      setRecentFinals((prev) => prev.filter((f) => Date.now() - f.timestamp < 10000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Hand detection loop
  const handleFrame = useCallback(
    (video: HTMLVideoElement) => {
      const result = detect(video);
      const ctx = canvasRef.current?.getContext("2d");

      if (result && ctx) {
        drawLandmarks(ctx, result.landmarks, 640, 480);
        const gesture = estimate(result.landmarks[0]);
        if (gesture) {
          setCurrentLetter(gesture.letter);
          setCurrentConfidence(gesture.confidence);
          update(gesture.letter, gesture.confidence);
        } else {
          setCurrentLetter(null);
          setCurrentConfidence(0);
          update(null, 0);
        }
      } else if (ctx) {
        ctx.clearRect(0, 0, 640, 480);
        setCurrentLetter(null);
        setCurrentConfidence(0);
        update(null, 0);
      }
    },
    [detect, estimate, update, drawLandmarks]
  );

  // Send resume to server when set
  const handleResumeFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeParsing(true);
    setResumeFileName(file.name);
    try {
      const text = await extractTextFromPdf(file);
      setResume(text);
    } catch {
      setResume("");
      setResumeFileName("");
    } finally {
      setResumeParsing(false);
    }
  }, []);

  const handleResumeSubmit = useCallback(() => {
    if (socket && connected && resume.trim()) {
      socket.emit("live:set-resume", { resume: resume.trim() });
    }
    setShowResumeInput(false);
  }, [socket, connected, resume]);

  // Handle AI option selection — skip polish, direct to TTS
  const selectOption = useCallback(
    (option: AiOption) => {
      const text = option.text.trim();
      if (!socket || !connected || !text) return;
      setAiOptions([]);
      setSelectionFeedback(`Selected option ${option.label}`);
      setTimeout(() => setSelectionFeedback(null), 2000);
      setChatMessages((prev) => [
        ...prev,
        { sender: "you", text, timestamp: new Date() },
      ]);
      // Use select-option event (skips polish)
      socket.emit("live:select-option", { label: option.label, text });
    },
    [socket, connected]
  );

  // Pass stable letter directly to OptionSelector for gesture detection
  // Only pass to WordBuilder when no AI options are showing
  const detectedOptionLetter =
    stable && aiOptions.length > 0 && ["A", "B", "C", "D"].includes(stable.letter)
      ? stable.letter
      : null;

  const effectiveStable =
    stable && aiOptions.length > 0 && ["A", "B", "C", "D"].includes(stable.letter)
      ? null
      : stable;

  // Speech-to-text
  const setupSTTListeners = useCallback(() => {
    if (!socket || listenersSetup.current) return;
    listenersSetup.current = true;

    socket.on("live:transcript", (data: { text: string; isFinal: boolean }) => {
      setLastTranscriptTime(Date.now());
      if (data.isFinal) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "interviewer", text: data.text, timestamp: new Date() },
        ]);
        setRecentFinals((prev) => [...prev, { text: data.text, timestamp: Date.now() }]);
        setInterimText("");
        setSuggestionsLoading(true);
        // Auto-suggestions are triggered server-side now,
        // but also request manually as fallback
        socket.emit("live:suggest", { transcript: data.text });
      } else {
        setInterimText(data.text);
      }
    });

    socket.on("live:stt-state", (data: { state: TranscriptionState }) => {
      setSttState(data.state);
    });

    socket.on("live:suggestions", (data: { options: AiOption[] }) => {
      setSuggestionsLoading(false);
      setAiOptions(data.options);
      // Clear options after 45 seconds if not selected
      setTimeout(() => setAiOptions((prev) => (prev === data.options ? [] : prev)), 45000);
    });

    socket.on("live:selection-ack", (data: { label: string }) => {
      setSelectionFeedback(`Option ${data.label} confirmed`);
      setTimeout(() => setSelectionFeedback(null), 1500);
    });

    socket.on("live:audio-chunk", (data: { audio: string }) => {
      enqueueAudio(data.audio);
    });
  }, [socket, enqueueAudio]);

  const onAudioData = useCallback(
    (chunk: Blob) => {
      if (socket && connected) {
        chunk.arrayBuffer().then((buf) => {
          socket.emit("live:audio-in", buf);
        });
      }
    },
    [socket, connected]
  );

  const { start, stop, restart } = useAudioCapture(onAudioData);

  // Browser SpeechRecognition fallback
  const handleFallbackTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "interviewer", text, timestamp: new Date() },
        ]);
        setInterimText("");
        setSuggestionsLoading(true);
        if (socket && connected) {
          socket.emit("live:suggest", { transcript: text });
        }
      } else {
        setInterimText(text);
      }
    },
    [socket, connected]
  );

  const {
    start: startFallbackSTT,
    stop: stopFallbackSTT,
    supported: browserSTTSupported,
  } = useSpeechRecognition({ onTranscript: handleFallbackTranscript });

  // Activate browser STT fallback when Deepgram fails
  useEffect(() => {
    if (sttState === "failed" && browserSTTSupported) {
      startFallbackSTT();
    }
  }, [sttState, browserSTTSupported, startFallbackSTT]);

  // Toggle captions visibility (connection stays active)
  const toggleCaptions = useCallback(() => {
    setCaptionsVisible((prev) => !prev);
  }, []);

  // Start STT (called once, stays on)
  const startListening = useCallback(async () => {
    if (listening) return;
    if (connected && socket) {
      setupSTTListeners();
      socket.emit("live:start-listening");
      await start();
      setListening(true);
    } else if (browserSTTSupported) {
      startFallbackSTT();
      setListening(true);
    }
  }, [listening, socket, connected, start, setupSTTListeners, startFallbackSTT, browserSTTSupported]);

  // Retry STT from failed state
  const handleRetrySTT = useCallback(async () => {
    if (socket && connected) {
      socket.emit("live:start-listening");
      await restart();
    }
  }, [socket, connected, restart]);

  // Socket.IO reconnect detection: re-establish STT if socket reconnects
  useEffect(() => {
    if (connected && !prevConnectedRef.current && listening && socket) {
      socket.emit("live:start-listening");
      restart();
    }
    prevConnectedRef.current = connected;
  }, [connected, listening, socket, restart]);

  // Auto-start listening when interview begins (resume dismissed)
  const startListeningOnce = useRef(false);
  useEffect(() => {
    if (!showResumeInput && !startListeningOnce.current && !listening) {
      startListeningOnce.current = true;
      const id = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(id);
    }
  }, [showResumeInput, listening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      stopFallbackSTT();
      socket?.emit("live:stop-listening");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTextReady = useCallback(
    (text: string) => {
      if (!socket || !connected || !text.trim()) return;
      setChatMessages((prev) => [
        ...prev,
        { sender: "you", text: text.trim(), timestamp: new Date() },
      ]);
      socket.emit("live:sign-text", { text: text.trim() });
    },
    [socket, connected]
  );

  const handleQuickPhrase = useCallback(
    (text: string) => {
      if (!socket || !connected) return;
      setChatMessages((prev) => [
        ...prev,
        { sender: "you", text, timestamp: new Date() },
      ]);
      socket.emit("live:quick-phrase", { text });
    },
    [socket, connected]
  );

  const handleChatSubmit = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: "you", text, timestamp: new Date() },
    ]);
    if (socket && connected) {
      socket.emit("live:sign-text", { text });
    }
    setChatInput("");
  }, [chatInput, socket, connected]);

  return (
    <div
      className="h-screen flex flex-col bg-[#f8fbff] text-black overflow-hidden select-none"
      style={{ fontFamily: "'Google Sans', 'Roboto', Arial, sans-serif" }}
    >
      {/* ── Resume input overlay ── */}
      {showResumeInput && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-black">Upload your resume</h2>
            <p className="text-sm text-black/60">
              Upload a PDF resume. AI will generate personalized response options.
              Sign <span className="font-mono font-bold">A</span>, <span className="font-mono font-bold">B</span>, <span className="font-mono font-bold">C</span>, or <span className="font-mono font-bold">D</span> to pick a suggestion.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleResumeFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={resumeParsing}
              className="w-full border-2 border-dashed border-[#ade8f4] hover:border-[#0077b6] rounded-xl p-8 flex flex-col items-center gap-3 transition-colors disabled:opacity-50"
            >
              {resumeParsing ? (
                <>
                  <svg className="animate-spin w-8 h-8 text-[#0077b6]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-black/50">Parsing PDF...</span>
                </>
              ) : resumeFileName ? (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#0077b6">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6z" />
                  </svg>
                  <span className="text-sm font-medium text-[#0077b6]">{resumeFileName}</span>
                  <span className="text-xs text-black/40">Click to change file</span>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#ade8f4">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6z" />
                  </svg>
                  <span className="text-sm text-black/50">Click to upload PDF resume</span>
                </>
              )}
            </button>

            {resume && (
              <div className="bg-[#f0f9ff] border border-[#ade8f4] rounded-xl p-3 max-h-32 overflow-y-auto">
                <span className="text-[10px] text-[#0077b6] uppercase tracking-wider font-medium">Parsed text</span>
                <p className="text-xs text-black/60 mt-1 whitespace-pre-wrap">{resume.slice(0, 500)}{resume.length > 500 ? "..." : ""}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResumeInput(false)}
                className="text-sm px-4 py-2 rounded-lg hover:bg-[#caf0f8] transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleResumeSubmit}
                disabled={resumeParsing}
                className="text-sm px-5 py-2 bg-[#0077b6] hover:bg-[#023e8a] text-white rounded-lg transition-colors disabled:opacity-40"
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-[#caf0f8]">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-lg font-medium text-black tracking-tight truncate">
            UniVoice Interview
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!ready && (
            <span className="text-xs bg-[#00b4d8]/15 text-[#0077b6] px-3 py-1 rounded-full">
              Loading model...
            </span>
          )}
          {/* Gesture detection feedback */}
          {currentLetter && (
            <span className="flex items-center gap-1.5 bg-[#caf0f8] px-3 py-1.5 rounded-full">
              <span className="text-base font-medium font-mono">{currentLetter}</span>
              <span className={`text-xs ${currentConfidence >= 60 ? "text-[#0077b6]" : "text-[#00b4d8]"}`}>
                {currentConfidence}%
              </span>
            </span>
          )}
          {/* Selection feedback toast */}
          {selectionFeedback && (
            <span className="text-xs bg-[#0077b6] text-white px-3 py-1.5 rounded-full animate-pulse">
              {selectionFeedback}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-black/60">
          <span>{clock}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#0077b6]" : "bg-red-400"}`} />
            <span className="text-xs">{connected ? "Connected" : "Offline"}</span>
          </div>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0 p-2 gap-2">
        {/* Left: video grid + option selector below */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Video tiles */}
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0 relative">
            {/* Interviewer */}
            <div className="relative bg-black rounded-xl overflow-hidden group">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#023e8a] flex items-center justify-center mb-2">
                  <span className="text-2xl font-normal text-white">I</span>
                </div>
                <span className="text-sm text-white/80">Interviewer</span>
              </div>
              {listening && interimText && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-3 px-3">
                  <p className="text-sm text-white text-center">{interimText}</p>
                </div>
              )}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] text-white bg-black/60 px-2 py-0.5 rounded">Interviewer</span>
              </div>
              {listening && interimText && (
                <div className="absolute inset-0 rounded-xl border-2 border-[#0077b6] pointer-events-none" />
              )}
            </div>

            {/* You (webcam) */}
            <div className="relative bg-black rounded-xl overflow-hidden group">
              {camOn ? (
                <WebcamFeed onFrame={handleFrame} canvasRef={canvasRef} className="w-full h-full rounded-xl" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#0077b6] flex items-center justify-center mb-2">
                    <span className="text-2xl font-normal text-white">Y</span>
                  </div>
                  <span className="text-sm text-white/80">You</span>
                </div>
              )}
              {currentLetter && (
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow">
                  <span className="text-xl font-medium text-black">{currentLetter}</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] text-white bg-black/60 px-2 py-0.5 rounded">You</span>
              </div>
              {!micOn && (
                <div className="absolute bottom-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ea4335">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                    </svg>
                  </div>
                </div>
              )}
              {currentLetter && (
                <div className="absolute inset-0 rounded-xl border-2 border-[#0077b6] pointer-events-none" />
              )}
            </div>

            {/* Panel Member */}
            <div className="relative bg-black rounded-xl overflow-hidden group">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#0096c7] flex items-center justify-center mb-2">
                  <span className="text-2xl font-normal text-white">P</span>
                </div>
                <span className="text-sm text-white/80">Panel Member</span>
              </div>
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] text-white bg-black/60 px-2 py-0.5 rounded">Panel Member</span>
              </div>
            </div>

            {/* Closed captions overlay */}
            {captionsVisible && (
              <ClosedCaptions
                interimText={interimText}
                recentFinals={recentFinals}
                sttState={sttState}
                silenceDuration={silenceDuration}
                onRetry={handleRetrySTT}
              />
            )}
          </div>

          {/* ── Primary input area: Option Selector OR waiting state ── */}
          <div className="shrink-0 bg-white rounded-xl border border-[#caf0f8] p-3">
            {aiOptions.length > 0 ? (
              <OptionSelector
                options={aiOptions}
                onSelect={selectOption}
                onDismiss={() => setAiOptions([])}
                detectedLetter={detectedOptionLetter}
              />
            ) : suggestionsLoading ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <span className="inline-block w-4 h-4 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-black/50">Generating response options...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/50 uppercase tracking-wider font-medium">
                    {listening ? "Listening to interviewer... options will appear here" : "Start listening to begin"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTypeFallback(!showTypeFallback)}
                      className="text-[10px] text-[#0077b6] hover:underline"
                    >
                      {showTypeFallback ? "Hide typing" : "Type instead"}
                    </button>
                    <AslGuide />
                  </div>
                </div>

                {/* Fallback: WordBuilder for manual signing (de-prioritized) */}
                {showTypeFallback && (
                  <WordBuilder stabilizedLetter={effectiveStable} onTextReady={handleTextReady} />
                )}

                {!showTypeFallback && !listening && (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-sm text-black/40">
                      Click the captions button below to start listening
                    </p>
                    <p className="text-xs text-black/30">
                      When the interviewer speaks, AI will generate 4 response options. Sign A, B, C, or D to respond.
                    </p>
                  </div>
                )}

                {!showTypeFallback && listening && (
                  <div className="text-center py-4 space-y-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0077b6] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0077b6]" />
                      </span>
                      <span className="text-sm text-[#0077b6]">Listening...</span>
                    </div>
                    {interimText && (
                      <p className="text-sm text-black/50 italic">&ldquo;{interimText}&rdquo;</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Chat sidebar ── */}
        {chatOpen && (
          <div className="w-[340px] shrink-0 bg-white flex flex-col min-h-0 rounded-xl border border-[#caf0f8] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-[#caf0f8] shrink-0">
              <span className="text-sm font-medium">Messages</span>
              <button
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#caf0f8] flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#333">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Quick replies */}
            <div className="px-3 py-2 border-b border-[#caf0f8] shrink-0">
              <div className="flex flex-wrap gap-1">
                {QUICK_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => handleQuickPhrase(phrase)}
                    disabled={!connected}
                    className="text-[11px] bg-transparent border border-[#ade8f4] text-black px-2.5 py-1 rounded-full
                      hover:bg-[#caf0f8] hover:border-[#0077b6] hover:text-[#0077b6]
                      transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {chatMessages.length === 0 && !interimText && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ade8f4" className="mb-3">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                  </svg>
                  <p className="text-sm text-black/50 mb-1">No messages yet</p>
                  <p className="text-xs text-black/30 max-w-[200px]">
                    When the interviewer speaks, response options will appear. Sign A-D to respond.
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-medium">
                      {msg.sender === "you" ? "You" : "Interviewer"}
                    </span>
                    <span className="text-[10px] text-black/40">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-black/80 leading-relaxed">{msg.text}</p>
                </div>
              ))}
              {interimText && (
                <div>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-medium">Interviewer</span>
                    <span className="text-[10px] text-black/40">typing</span>
                  </div>
                  <p className="text-sm text-black/50 italic">{interimText}...</p>
                </div>
              )}
              {aiOptions.length > 0 && (
                <div className="bg-[#caf0f8]/60 border border-[#ade8f4] rounded-lg px-3 py-2.5 space-y-2">
                  <span className="text-[10px] text-[#0077b6] uppercase tracking-wider font-medium">
                    Sign A, B, C, or D to respond
                  </span>
                  {aiOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => selectOption(opt)}
                      className="w-full text-left flex gap-2 items-start p-2 rounded-lg hover:bg-[#0077b6]/10 transition-colors group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#0077b6] text-white text-xs font-bold flex items-center justify-center group-hover:bg-[#023e8a]">
                        {opt.label}
                      </span>
                      <span className="text-sm text-black/70 group-hover:text-black leading-snug">
                        {opt.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat input box */}
            <div className="px-3 py-2 border-t border-[#caf0f8] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleChatSubmit();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a response..."
                  className="flex-1 text-sm bg-[#f0f9ff] border border-[#ade8f4] rounded-full px-4 py-2 outline-none focus:border-[#0077b6] transition-colors placeholder:text-black/30"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-[#0077b6] hover:bg-[#023e8a] flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom control bar ── */}
      <div className="h-16 flex items-center justify-between px-6 shrink-0 border-t border-[#caf0f8]">
        {/* Left */}
        <div className="flex items-center gap-3 w-48">
          <span className="text-sm text-black/50">{clock}</span>
          <span className="text-[#caf0f8]">|</span>
          <span className="text-xs text-black/50 truncate">univoice-interview</span>
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              micOn ? "bg-[#caf0f8] hover:bg-[#ade8f4]" : "bg-[#ea4335] hover:bg-[#d33828]"
            }`}
            title={micOn ? "Mute" : "Unmute"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={micOn ? "#03045e" : "white"}>
              {micOn ? (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              ) : (
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
              )}
            </svg>
          </button>

          {/* Camera */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              camOn ? "bg-[#caf0f8] hover:bg-[#ade8f4]" : "bg-[#ea4335] hover:bg-[#d33828]"
            }`}
            title={camOn ? "Camera off" : "Camera on"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={camOn ? "#03045e" : "white"}>
              {camOn ? (
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              ) : (
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
              )}
            </svg>
          </button>

          {/* Captions visibility toggle (STT stays always-on) */}
          <button
            onClick={toggleCaptions}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              captionsVisible ? "bg-[#0077b6] hover:bg-[#023e8a]" : "bg-[#caf0f8] hover:bg-[#ade8f4]"
            }`}
            title={captionsVisible ? "Hide captions" : "Show captions"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={captionsVisible ? "white" : "#03045e"}>
              <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
            </svg>
          </button>

          <div className="w-px h-7 bg-[#caf0f8] mx-1" />

          {/* Leave */}
          <button
            className="h-9 px-5 rounded-full bg-[#ea4335] hover:bg-[#d33828] flex items-center justify-center transition-all"
            title="Leave call"
            onClick={() => { window.location.href = "/"; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>

        {/* Right: chat toggle */}
        <div className="flex items-center gap-2 w-48 justify-end">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              chatOpen ? "bg-[#caf0f8]" : "hover:bg-[#caf0f8]"
            }`}
            title="Toggle chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={chatOpen ? "#0077b6" : "#333"}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
