"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { useTrainingProgress } from "@/hooks/useTrainingProgress";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { MODULES } from "@/lib/questions";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";

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

export default function PracticePage() {
  const params = useParams<{ moduleId: string; questionId: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { detect, ready } = useMediaPipe();
  const { estimate } = useFingerpose();
  const { stable, update } = useLetterStabilizer();
  const drawLandmarks = useDrawLandmarks();
  const { socket, connected } = useSocket();
  const { user, signOut } = useAuth();
  const supabase = createClient();
  const { markComplete } = useTrainingProgress();

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [feedback, setFeedback] = useState<STARFeedback | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  // Resolve module + question from URL params
  const activeModule = MODULES.find((m) => m.id === params.moduleId);
  const activeQuestion = activeModule?.questions.find(
    (q) => q.id === params.questionId
  );

  // Redirect if invalid params
  useEffect(() => {
    if (!activeModule || !activeQuestion) {
      router.replace("/training");
    }
  }, [activeModule, activeQuestion, router]);

  if (!activeModule || !activeQuestion) {
    return null;
  }

  const question = activeQuestion.prompt;
  const questionIndexInModule = activeModule.questions.indexOf(activeQuestion);

  // Find next question for navigation
  const getNextQuestionUrl = (): string | null => {
    const curQIdx = questionIndexInModule;

    // Next in same module
    if (curQIdx + 1 < activeModule.questions.length) {
      return `/training/${activeModule.id}/${activeModule.questions[curQIdx + 1].id}`;
    }

    // First question of next module
    const curModIdx = MODULES.findIndex((m) => m.id === activeModule.id);
    if (curModIdx + 1 < MODULES.length) {
      const nextMod = MODULES[curModIdx + 1];
      return `/training/${nextMod.id}/${nextMod.questions[0].id}`;
    }

    return null;
  };

  const handleFrame = (video: HTMLVideoElement) => {
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
  };

  const saveSession = async (answer: string, fb: STARFeedback) => {
    if (!user) return;
    await supabase.from("training_sessions").insert({
      user_id: user.id,
      question,
      question_index: questionIndexInModule,
      answer,
      star_situation: fb.situation,
      star_task: fb.task,
      star_action: fb.action,
      star_result: fb.result,
      improvements: fb.improvements,
      polished_answer: fb.polishedAnswer,
    });
  };

  const submitAnswer = (answer: string) => {
    if (!socket || !connected) {
      setError("Not connected to server");
      return;
    }

    setLoading(true);
    setError(null);
    setLastAnswer(answer);
    setFeedback(null);

    socket.emit("training:submit", { question, answer, userId: user?.id });

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
          markComplete(activeQuestion.id, data.feedback);
          saveSession(answer, data.feedback);
        } else {
          setError(data.error || "Something went wrong");
        }
      }
    );
  };

  const nextUrl = getNextQuestionUrl();

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
          <Link
            href="/training"
            className="text-xs uppercase tracking-wider text-[var(--landing-muted)] hover:text-[#0077b6] transition-colors"
          >
            &#8592; All Modules
          </Link>
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
            {user && (
              <>
                <span className="text-xs text-[var(--landing-muted)] hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/auth");
                  }}
                  className="text-xs uppercase tracking-wider border border-[var(--landing-border)] px-3 py-1.5 rounded-sm hover:border-[#0077b6] hover:text-[#0077b6] transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-8 flex flex-col gap-8">
        {!ready && (
          <p className="text-[var(--landing-muted)] text-sm uppercase tracking-wider">
            Loading hand detection model...
          </p>
        )}

        {/* Question */}
        <QuestionCard
          question={question}
          index={questionIndexInModule}
          total={activeModule.questions.length}
          moduleName={activeModule.title}
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: webcam + detection */}
          <div className="space-y-4">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm overflow-hidden">
              <WebcamFeed onFrame={handleFrame} canvasRef={canvasRef} />
            </div>
            <LetterDisplay
              letter={currentLetter}
              confidence={currentConfidence}
            />
          </div>

          {/* Right: answer building + feedback */}
          <div className="space-y-6">
            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">
                Word Builder
              </span>
              <WordBuilder
                stabilizedLetter={stable}
                onTextReady={submitAnswer}
              />
            </div>

            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6">
              <span className="landing-label-inline mb-4 block">
                Text Input
              </span>
              <TextFallbackInput onSubmit={submitAnswer} />
            </div>

            {demoMode && !loading && !feedback && (
              <button
                className="btn-pill w-full"
                onClick={() => {
                  const demoAnswer =
                    DEMO_ANSWERS[demoIndex % DEMO_ANSWERS.length];
                  setDemoIndex((i) => i + 1);
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
                <FeedbackPanel
                  feedback={feedback}
                  originalAnswer={lastAnswer}
                />
                <div className="flex gap-3">
                  <Link href="/training" className="btn-pill flex-1 text-center">
                    Back to Modules
                  </Link>
                  {nextUrl && (
                    <Link href={nextUrl} className="btn-pill flex-1 text-center">
                      Next Question &#8594;
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
