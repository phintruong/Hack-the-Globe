"use client";

import { useState } from "react";
import Link from "next/link";
import { useTrainingProgress } from "@/hooks/useTrainingProgress";
import { MODULES } from "@/lib/questions";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TrainingPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { getModuleProgress, isQuestionComplete } = useTrainingProgress();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(MODULES.map((m) => m.id))
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Overall progress
  const totalQuestions = MODULES.reduce((s, m) => s + m.questions.length, 0);
  const totalCompleted = MODULES.reduce(
    (s, m) => s + getModuleProgress(m.id).completed,
    0
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
            UniVoice
          </Link>
          <div className="h-4 w-px bg-[var(--landing-border)]" />
          <span className="landing-label-inline">Training Mode</span>
          <div className="ml-auto flex items-center gap-3">
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

      <main className="max-w-[900px] mx-auto px-8 py-10">
        {/* Overall progress */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-[var(--landing-text)] mb-2">
            Interview Practice
          </h1>
          <p className="text-sm text-[var(--landing-muted)] mb-4">
            {totalCompleted} / {totalQuestions} questions completed
          </p>
          <div className="w-full h-2 bg-[var(--landing-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0077b6] rounded-full transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (totalCompleted / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Module list */}
        <div className="space-y-3">
          {MODULES.map((mod) => {
            const { completed, total } = getModuleProgress(mod.id);
            const isExpanded = expanded.has(mod.id);
            const allDone = completed === total;
            const progressPct = total > 0 ? (completed / total) * 100 : 0;

            return (
              <div
                key={mod.id}
                className="border border-[var(--landing-border)] rounded-md overflow-hidden bg-white"
              >
                {/* Module header */}
                <button
                  onClick={() => toggle(mod.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors"
                >
                  <svg
                    className={`w-4 h-4 shrink-0 text-[var(--landing-muted)] transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>

                  <span
                    className={`text-base font-medium ${
                      allDone
                        ? "text-[#0077b6]"
                        : "text-[var(--landing-text)]"
                    }`}
                  >
                    {mod.title}
                  </span>

                  <span className="text-sm tabular-nums text-[var(--landing-muted)] ml-1">
                    {completed} / {total}
                  </span>

                  {/* Progress bar */}
                  <div className="flex-1 h-1.5 bg-[var(--landing-border)] rounded-full overflow-hidden ml-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        allDone ? "bg-[#00b894]" : "bg-[#0077b6]"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </button>

                {/* Question list */}
                {isExpanded && (
                  <div className="border-t border-[var(--landing-border)]">
                    {mod.questions.map((q, idx) => {
                      const isDone = isQuestionComplete(q.id);

                      return (
                        <Link
                          key={q.id}
                          href={`/training/${mod.id}/${q.id}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-[#0077b6]/5 transition-colors border-b border-[var(--landing-border)] last:border-b-0"
                        >
                          {/* Status icon */}
                          {isDone ? (
                            <svg
                              className="w-5 h-5 shrink-0 text-[#00b894]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[var(--landing-border)]" />
                          )}

                          {/* Question number */}
                          <span className="text-xs tabular-nums text-[var(--landing-muted)] w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>

                          {/* Question text */}
                          <span
                            className={`text-sm ${
                              isDone
                                ? "text-[var(--landing-muted)]"
                                : "text-[var(--landing-text)]"
                            }`}
                          >
                            {q.prompt}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
