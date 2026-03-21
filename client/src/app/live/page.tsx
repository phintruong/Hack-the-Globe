"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { WebcamFeed } from "@/components/WebcamFeed";
import { WordBuilder } from "@/components/WordBuilder";
import { AslGuide } from "@/components/AslGuide";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useFingerpose } from "@/hooks/useFingerpose";
import { useLetterStabilizer } from "@/hooks/useLetterStabilizer";
import { useDrawLandmarks } from "@/components/HandLandmarkRenderer";
import { useSocket } from "@/hooks/useSocket";
import { useAudioCapture } from "@/hooks/useAudioCapture";

interface ChatMessage {
  sender: "you" | "interviewer" | "system";
  text: string;
  timestamp: Date;
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
  const listenersSetup = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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

  // Speech-to-text
  const setupSTTListeners = useCallback(() => {
    if (!socket || listenersSetup.current) return;
    listenersSetup.current = true;

    socket.on("live:transcript", (data: { text: string; isFinal: boolean }) => {
      if (data.isFinal) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "interviewer", text: data.text, timestamp: new Date() },
        ]);
        setInterimText("");
      } else {
        setInterimText(data.text);
      }
    });
  }, [socket]);

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

  const { start, stop } = useAudioCapture(onAudioData);

  const toggleListening = useCallback(async () => {
    if (listening) {
      stop();
      socket?.emit("live:stop-listening");
      setListening(false);
    } else {
      setupSTTListeners();
      socket?.emit("live:start-listening");
      await start();
      setListening(true);
    }
  }, [listening, socket, start, stop, setupSTTListeners]);

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
              Loading model…
            </span>
          )}
          {currentLetter && (
            <span className="flex items-center gap-1.5 bg-[#caf0f8] px-3 py-1.5 rounded-full">
              <span className="text-base font-medium font-mono">{currentLetter}</span>
              <span className={`text-xs ${currentConfidence >= 60 ? "text-[#0077b6]" : "text-[#00b4d8]"}`}>
                {currentConfidence}%
              </span>
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
        {/* Left: video grid + sign input below user */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Video tiles */}
          <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
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
          </div>

          {/* Sign input area — below the video tiles */}
          <div className="shrink-0 bg-white rounded-xl border border-[#caf0f8] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-black/50 uppercase tracking-wider font-medium">Sign to Speak</span>
              <AslGuide />
            </div>
            <WordBuilder stabilizedLetter={stable} onTextReady={handleTextReady} />
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
                    Type below, use quick replies, or sign to send messages
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
                  <p className="text-sm text-black/50 italic">{interimText}…</p>
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
                  placeholder="Send a message…"
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

          {/* Captions */}
          <button
            onClick={toggleListening}
            disabled={!connected}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              listening ? "bg-[#0077b6] hover:bg-[#023e8a]" : "bg-[#caf0f8] hover:bg-[#ade8f4]"
            } disabled:opacity-40`}
            title={listening ? "Captions off" : "Captions on"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={listening ? "white" : "#03045e"}>
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
