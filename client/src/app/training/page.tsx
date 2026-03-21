"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { WebcamFeed } from "@/components/WebcamFeed";
import { LetterDisplay } from "@/components/LetterDisplay";
import { WordBuilder } from "@/components/WordBuilder";
import { TextFallbackInput } from "@/components/TextFallbackInput";
import { QuestionCard } from "@/components/QuestionCard";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useFingerpose } from "@/hooks/useFingerpose";
import { useLetterStabilizer } from "@/hooks/useLetterStabilizer";
import { useDrawLandmarks } from "@/components/HandLandmarkRenderer";
import { useSocket } from "@/hooks/useSocket";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { INTERVIEW_QUESTIONS } from "@/lib/questions";

const DEMO_ANSWERS = [
  "At my previous company, we had a critical production outage during peak hours. I was tasked with leading the incident response team. I coordinated between three engineering teams, identified the root cause as a database connection pool exhaustion, and implemented a fix within 2 hours. As a result, we reduced our mean time to recovery by 40% and I created a runbook that prevented similar issues.",
  "In my last role, I worked with a colleague who had a very different communication style. I scheduled regular one-on-one check-ins to better understand their perspective. By actively listening and finding common ground on our project goals, we ended up delivering the project two weeks ahead of schedule.",
];

interface STARFeedback {
  situation: number;
  task: number;
  action: number;
  result: number;
  improvements: string[];
  polishedAnswer: string;
}

export default function TrainingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { detect, ready } = useMediaPipe();
  const { estimate } = useFingerpose();
  const { stable, update } = useLetterStabilizer();
  const drawLandmarks = useDrawLandmarks();
  const { socket, connected } = useSocket();

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<STARFeedback | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const question = INTERVIEW_QUESTIONS[questionIndex];

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

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!socket || !connected) {
        setError("Not connected to server");
        return;
      }

      setLoading(true);
      setError(null);
      setLastAnswer(answer);
      setFeedback(null);

      socket.emit("training:submit", { question, answer });

      socket.once(
        "training:feedback",
        (data: {
          success: boolean;
          feedback?: STARFeedback;
          error?: string;
        }) => {
          setLoading(false);
          if (data.success && data.feedback) {
            setFeedback(data.feedback);
          } else {
            setError(data.error || "Something went wrong");
          }
        }
      );
    },
    [socket, connected, question]
  );

  const nextQuestion = useCallback(() => {
    setQuestionIndex((i) => (i + 1) % INTERVIEW_QUESTIONS.length);
    setFeedback(null);
    setLastAnswer("");
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] font-[Helvetica_Neue,Helvetica,Arial,sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--landing-bg)] border-b border-[var(--landing-border)]">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-normal tracking-[-0.04em] text-[var(--landing-text)] hover:opacity-60 transition-opacity"
          >
            UniVoice
          </Link>
          <div className="h-4 w-px bg-[var(--landing-border)]" />
          <span className="landing-label-inline">Training Mode</span>
          <div className="ml-auto flex items-center gap-3">
            <DemoModeToggle
              enabled={demoMode}
              onToggle={() => setDemoMode((d) => !d)}
            />
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
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-8 flex flex-col gap-8">
        {!ready && (
          <p className="text-[var(--landing-muted)] text-sm uppercase tracking-wider">
            Loading hand detection model...
          </p>
        )}

        {/* Question */}
        <div>
          <QuestionCard
            question={question}
            index={questionIndex}
            total={INTERVIEW_QUESTIONS.length}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: webcam + detection */}
          <div className="space-y-4">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm overflow-hidden">
              <WebcamFeed onFrame={handleFrame} canvasRef={canvasRef} />
            </div>
            <LetterDisplay letter={currentLetter} confidence={currentConfidence} />
          </div>

          {/* Right: answer building + feedback */}
          <div className="space-y-6">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">Word Builder</span>
              <WordBuilder
                stabilizedLetter={stable}
                onTextReady={submitAnswer}
              />
            </div>

            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">Text Input</span>
              <TextFallbackInput onSubmit={submitAnswer} />
            </div>

            {demoMode && !loading && !feedback && (
              <button
                className="btn-pill w-full"
                onClick={() => {
                  const demoAnswer =
                    DEMO_ANSWERS[questionIndex % DEMO_ANSWERS.length];
                  submitAnswer(demoAnswer);
                }}
              >
                Demo: Submit Sample Answer
              </button>
            )}

            {loading && (
              <div className="text-center py-6 text-[var(--landing-muted)] text-sm uppercase tracking-wider">
                Evaluating your answer...
              </div>
            )}

            {error && (
              <div className="text-center py-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            {feedback && (
              <>
                <FeedbackPanel feedback={feedback} originalAnswer={lastAnswer} />
                <button onClick={nextQuestion} className="btn-pill w-full">
                  Next Question &#8594;
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
