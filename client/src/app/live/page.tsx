"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { WebcamFeed } from "@/components/WebcamFeed";
import { LetterDisplay } from "@/components/LetterDisplay";
import { SpeechToTextPanel } from "@/components/SpeechToTextPanel";
import { SignToSpeechPanel } from "@/components/SignToSpeechPanel";
import { QuickPhrases } from "@/components/QuickPhrases";
import { ConversationLog, type LogEntry } from "@/components/ConversationLog";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useFingerpose } from "@/hooks/useFingerpose";
import { useLetterStabilizer } from "@/hooks/useLetterStabilizer";
import { useDrawLandmarks } from "@/components/HandLandmarkRenderer";
import { useSocket } from "@/hooks/useSocket";

export default function LivePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { detect, ready } = useMediaPipe();
  const { estimate } = useFingerpose();
  const { stable, update } = useLetterStabilizer();
  const drawLandmarks = useDrawLandmarks();
  const { socket, connected } = useSocket();

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [aiHint, setAiHint] = useState("");

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

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setLog((prev) => [
        ...prev,
        { speaker: "interviewer", text, timestamp: new Date() },
      ]);
      // Request AI suggestion
      if (socket && connected) {
        socket.emit("live:suggest", { transcript: text });
        socket.once("live:suggestion", (data: { hint: string }) => {
          setAiHint(data.hint);
        });
      }
    },
    [socket, connected]
  );

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] font-[Helvetica_Neue,Helvetica,Arial,sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--landing-bg)] border-b border-[var(--landing-border)]">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-normal tracking-[-0.04em] text-[var(--landing-text)] hover:opacity-60 transition-opacity"
          >
            SignSpeak
          </Link>
          <div className="h-4 w-px bg-[var(--landing-border)]" />
          <span className="landing-label-inline">Live Interview</span>
          <div className="ml-auto flex gap-3">
            <Badge
              variant={connected ? "outline" : "destructive"}
              className={
                connected
                  ? "border-[var(--landing-border)] text-[var(--landing-muted)] bg-transparent text-xs uppercase tracking-wider"
                  : "text-xs uppercase tracking-wider"
              }
            >
              {connected ? "Connected" : "Disconnected"}
            </Badge>
            {!ready && (
              <Badge
                variant="outline"
                className="border-[var(--landing-border)] text-[var(--landing-muted)] bg-transparent text-xs uppercase tracking-wider"
              >
                Loading model...
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-8 flex flex-col gap-6">
        {/* Quick Phrases */}
        <div className="border border-[var(--landing-border)] bg-white rounded-sm p-4">
          <span className="landing-label-inline mb-3 block">Quick Phrases</span>
          <QuickPhrases socket={socket} connected={connected} />
        </div>

        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          {/* Left: Sign panel */}
          <div className="space-y-4">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm overflow-hidden">
              <WebcamFeed onFrame={handleFrame} canvasRef={canvasRef} />
            </div>
            <LetterDisplay letter={currentLetter} confidence={currentConfidence} />

            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">Sign to Speech</span>
              <SignToSpeechPanel
                socket={socket}
                connected={connected}
                stabilizedLetter={stable}
              />
            </div>
          </div>

          {/* Right: Transcript panel */}
          <div className="space-y-4">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">Speech to Text</span>
              <SpeechToTextPanel
                socket={socket}
                connected={connected}
                onFinalTranscript={handleFinalTranscript}
              />
            </div>

            {aiHint && (
              <div className="border border-[var(--landing-border)] bg-white rounded-sm p-4">
                <span className="landing-label-inline mb-2 block">
                  Suggested Response
                </span>
                <span className="text-sm text-[var(--landing-text)]">
                  {aiHint}
                </span>
              </div>
            )}

            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">
                Conversation Log
              </span>
              <ConversationLog entries={log} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
