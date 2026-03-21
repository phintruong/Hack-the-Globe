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
  const [sidePanel, setSidePanel] = useState<"chat" | "sign" | null>("chat");
  const [listening, setListening] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [interimText, setInterimText] = useState("");
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

  const panelOpen = sidePanel !== null;

  return (
    <div className="h-screen flex flex-col bg-[#202124] text-[#e8eaed] overflow-hidden select-none"
         style={{ fontFamily: "'Google Sans', 'Roboto', Arial, sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="h-16 flex items-center justify-between px-6 shrink-0">
        {/* Left: meeting info */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[22px] font-normal text-[#e8eaed] tracking-[-0.01em] truncate">
            UniVoice Interview
          </span>
        </div>

        {/* Center: status badges */}
        <div className="flex items-center gap-2">
          {!ready && (
            <span className="text-xs bg-[#ea8600]/20 text-[#fdd663] px-3 py-1 rounded-full">
              Loading model…
            </span>
          )}
          {currentLetter && (
            <span className="flex items-center gap-1.5 bg-[#303134] px-3 py-1.5 rounded-full">
              <span className="text-base font-medium font-mono">{currentLetter}</span>
              <span className={`text-xs ${currentConfidence >= 60 ? "text-[#81c995]" : "text-[#fdd663]"}`}>
                {currentConfidence}%
              </span>
            </span>
          )}
        </div>

        {/* Right: clock + connection */}
        <div className="flex items-center gap-4 text-sm text-[#9aa0a6]">
          <span>{clock}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#81c995]" : "bg-[#f28b82]"}`} />
            <span className="text-xs">{connected ? "Connected" : "Offline"}</span>
          </div>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0 px-2 pb-0">
        {/* Video grid container */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <div className={`w-full h-full grid gap-3 ${
            panelOpen ? "grid-cols-2" : "grid-cols-3"
          } auto-rows-fr`}>

            {/* Tile: Interviewer */}
            <div className="relative bg-[#3c4043] rounded-xl overflow-hidden group transition-all duration-200">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#6e4fa0] flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-3xl font-normal text-white">I</span>
                </div>
                <span className="text-sm text-[#dadce0] font-medium">Interviewer</span>
              </div>
              {/* Caption overlay */}
              {listening && interimText && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
                  <p className="text-sm text-white text-center leading-relaxed">{interimText}</p>
                </div>
              )}
              {/* Name label */}
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs text-[#e8eaed] bg-[#202124cc] px-2 py-1 rounded">
                  Interviewer
                </span>
              </div>
              {/* Active speaker border */}
              {listening && interimText && (
                <div className="absolute inset-0 rounded-xl border-2 border-[#8ab4f8] pointer-events-none" />
              )}
            </div>

            {/* Tile: You (webcam) */}
            <div className="relative bg-[#3c4043] rounded-xl overflow-hidden group transition-all duration-200">
              {camOn ? (
                <WebcamFeed
                  onFrame={handleFrame}
                  canvasRef={canvasRef}
                  className="w-full h-full rounded-xl"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#1a73e8] flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-3xl font-normal text-white">Y</span>
                  </div>
                  <span className="text-sm text-[#dadce0] font-medium">You</span>
                </div>
              )}
              {/* Detected letter badge */}
              {currentLetter && (
                <div className="absolute top-3 right-3 bg-[#202124cc] backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg">
                  <span className="text-2xl font-medium">{currentLetter}</span>
                </div>
              )}
              {/* Name label */}
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs text-[#e8eaed] bg-[#202124cc] px-2 py-1 rounded">You</span>
              </div>
              {/* Mic off indicator */}
              {!micOn && (
                <div className="absolute bottom-3 right-3">
                  <div className="w-7 h-7 rounded-full bg-[#202124cc] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f28b82">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Active speaker border when signing */}
              {currentLetter && (
                <div className="absolute inset-0 rounded-xl border-2 border-[#8ab4f8] pointer-events-none" />
              )}
            </div>

            {/* Tile: Panel Member */}
            <div className="relative bg-[#3c4043] rounded-xl overflow-hidden group transition-all duration-200">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-[#e37400] flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-3xl font-normal text-white">P</span>
                </div>
                <span className="text-sm text-[#dadce0] font-medium">Panel Member</span>
              </div>
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs text-[#e8eaed] bg-[#202124cc] px-2 py-1 rounded">
                  Panel Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        {sidePanel && (
          <div className="w-[360px] shrink-0 bg-[#202124] flex flex-col min-h-0 ml-2 rounded-xl border border-[#3c4043] overflow-hidden transition-all duration-300">
            {/* Panel header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-[#3c4043] shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidePanel("chat")}
                  className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                    sidePanel === "chat"
                      ? "bg-[#394457] text-[#8ab4f8] font-medium"
                      : "text-[#9aa0a6] hover:bg-[#303134]"
                  }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => setSidePanel("sign")}
                  className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                    sidePanel === "sign"
                      ? "bg-[#394457] text-[#8ab4f8] font-medium"
                      : "text-[#9aa0a6] hover:bg-[#303134]"
                  }`}
                >
                  Sign Input
                </button>
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="w-8 h-8 rounded-full hover:bg-[#303134] flex items-center justify-center transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Chat view */}
            {sidePanel === "chat" && (
              <>
                {/* Quick replies */}
                <div className="px-4 py-3 border-b border-[#3c4043] shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {["Yes", "No", "Could you repeat?", "Thank you", "I need a moment"].map((phrase) => (
                      <button
                        key={phrase}
                        onClick={() => handleQuickPhrase(phrase)}
                        disabled={!connected}
                        className="text-xs bg-transparent border border-[#5f6368] text-[#e8eaed] px-3 py-1.5 rounded-full
                          hover:bg-[#303134] hover:border-[#8ab4f8] hover:text-[#8ab4f8]
                          transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
                  {chatMessages.length === 0 && !interimText && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="#5f6368" className="mb-4">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                      </svg>
                      <p className="text-sm text-[#9aa0a6] mb-1">No messages yet</p>
                      <p className="text-xs text-[#5f6368] max-w-[220px]">
                        Messages sent here are visible to everyone in the call
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[#e8eaed]">
                          {msg.sender === "you" ? "You" : "Interviewer"}
                        </span>
                        <span className="text-[11px] text-[#5f6368]">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-[#dadce0] leading-relaxed pl-0">{msg.text}</p>
                    </div>
                  ))}
                  {interimText && (
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[#e8eaed]">Interviewer</span>
                        <span className="text-[11px] text-[#5f6368]">typing</span>
                      </div>
                      <p className="text-sm text-[#9aa0a6] italic leading-relaxed">{interimText}…</p>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </>
            )}

            {/* Sign input view */}
            {sidePanel === "sign" && (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
                <div className="relative">
                  <AslGuide />
                </div>
                <WordBuilder
                  stabilizedLetter={stable}
                  onTextReady={handleTextReady}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom control bar ── */}
      <div className="h-20 flex items-center justify-between px-6 shrink-0">
        {/* Left: meeting info */}
        <div className="flex items-center gap-3 w-52">
          <span className="text-sm text-[#9aa0a6]">{clock}</span>
          <span className="text-[#5f6368]">|</span>
          <span className="text-xs text-[#9aa0a6] truncate">univoice-interview</span>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-3">
          {/* Mic */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
              micOn
                ? "bg-[#3c4043] hover:bg-[#4a4e51] hover:shadow-md"
                : "bg-[#ea4335] hover:bg-[#d33828] hover:shadow-md"
            }`}
            title={micOn ? "Turn off microphone" : "Turn on microphone"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
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
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
              camOn
                ? "bg-[#3c4043] hover:bg-[#4a4e51] hover:shadow-md"
                : "bg-[#ea4335] hover:bg-[#d33828] hover:shadow-md"
            }`}
            title={camOn ? "Turn off camera" : "Turn on camera"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              {camOn ? (
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              ) : (
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
              )}
            </svg>
          </button>

          {/* Captions / STT */}
          <button
            onClick={toggleListening}
            disabled={!connected}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
              listening
                ? "bg-[#8ab4f8] hover:bg-[#aecbfa] hover:shadow-md"
                : "bg-[#3c4043] hover:bg-[#4a4e51] hover:shadow-md"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={listening ? "Turn off captions" : "Turn on captions"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={listening ? "#202124" : "white"}>
              <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
            </svg>
          </button>

          {/* Raise hand / Sign input toggle */}
          <button
            onClick={() => setSidePanel(sidePanel === "sign" ? null : "sign")}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
              sidePanel === "sign"
                ? "bg-[#8ab4f8] hover:bg-[#aecbfa] hover:shadow-md"
                : "bg-[#3c4043] hover:bg-[#4a4e51] hover:shadow-md"
            }`}
            title="Sign input"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={sidePanel === "sign" ? "#202124" : "white"}>
              <path d="M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-.23 0-.46.03-.67.09C14.46.66 13.56 0 12.5 0c-1.23 0-2.25.89-2.46 2.06C9.87 2.02 9.69 2 9.5 2 8.12 2 7 3.12 7 4.5v5.89c-.34-.31-.76-.51-1.22-.51-.59 0-1.13.28-1.49.72L1.45 14.3C.98 14.89.76 15.62.76 16.36c0 .97.39 1.9 1.09 2.59l3.41 3.41C6.33 23.44 7.85 24 9.44 24h5.56c3.31 0 6-2.69 6-6V7z" />
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#3c4043] mx-1" />

          {/* Leave call */}
          <button
            className="h-10 px-5 rounded-full bg-[#ea4335] hover:bg-[#d33828] flex items-center justify-center transition-all duration-150 hover:shadow-md"
            title="Leave call"
            onClick={() => { window.location.href = "/"; }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>

        {/* Right: panel toggles */}
        <div className="flex items-center gap-2 w-52 justify-end">
          {/* People */}
          <button
            className="w-12 h-12 rounded-full bg-transparent hover:bg-[#303134] flex items-center justify-center transition-colors"
            title="People"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaed">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </button>

          {/* Chat */}
          <button
            onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              sidePanel === "chat" ? "bg-[#394457]" : "hover:bg-[#303134]"
            }`}
            title="Chat with everyone"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={sidePanel === "chat" ? "#8ab4f8" : "#e8eaed"}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </button>

          {/* More options */}
          <button
            className="w-12 h-12 rounded-full bg-transparent hover:bg-[#303134] flex items-center justify-center transition-colors"
            title="More options"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaed">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
