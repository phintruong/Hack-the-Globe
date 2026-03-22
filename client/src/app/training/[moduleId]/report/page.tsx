"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import type { ModuleReport } from "@/types/index";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

function DimensionBar({
  dimension,
  average,
  verdict,
}: ModuleReport["dimensionAnalysis"][number]) {
  const label = dimension
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const color =
    verdict === "strong"
      ? "bg-[#00b894]"
      : verdict === "moderate"
        ? "bg-[#0077b6]"
        : "bg-amber-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-[var(--landing-text)]">{label}</span>
        <span className="text-[var(--landing-muted)]">
          {average}%{" "}
          <span
            className={`text-xs uppercase tracking-wider ml-1 ${
              verdict === "strong"
                ? "text-[#00b894]"
                : verdict === "needs-work"
                  ? "text-amber-600"
                  : "text-[#0077b6]"
            }`}
          >
            {verdict}
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-[var(--landing-border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${average}%` }}
        />
      </div>
    </div>
  );
}

function QuestionAccordion({
  answer,
}: {
  answer: ModuleReport["answers"][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--landing-border)] rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors text-left"
      >
        <svg
          className={`w-4 h-4 shrink-0 text-[var(--landing-muted)] transition-transform ${
            open ? "rotate-180" : ""
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
        <span className="text-sm text-[var(--landing-text)] flex-1">
          {answer.questionPrompt}
        </span>
        <span className="text-xs tabular-nums text-[var(--landing-muted)]">
          {answer.score}/100
        </span>
      </button>
      {open && (
        <div className="border-t border-[var(--landing-border)] px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-[var(--landing-muted)] uppercase tracking-wider mb-1">
              Your Answer
            </p>
            <p className="text-sm text-[var(--landing-text)] bg-black/[0.02] rounded p-3">
              {answer.answerText}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--landing-muted)] uppercase tracking-wider mb-1">
              Scores
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(answer.feedbackJson)
                .filter(
                  ([key]) =>
                    key !== "improvements" && key !== "polishedAnswer"
                )
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between text-xs bg-black/[0.02] rounded px-2 py-1"
                  >
                    <span className="text-[var(--landing-muted)]">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium">{val as number}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams<{ moduleId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<ModuleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (bustCache = false) => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);

      try {
        // Optionally bust cache
        if (bustCache) {
          await fetch(
            `${SERVER_URL}/api/report/${params.moduleId}?userId=${user.id}`,
            { method: "DELETE" }
          );
        }

        const res = await fetch(
          `${SERVER_URL}/api/report/${params.moduleId}?userId=${user.id}`
        );

        if (!res.ok) {
          const data = await res.json();
          setError(
            data.error || "Failed to load report. Complete the module first."
          );
          return;
        }

        setReport(await res.json());
      } catch {
        setError("Failed to connect to server.");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, params.moduleId]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
            {user && (
              <span className="text-xs text-[var(--landing-muted)] hidden sm:block">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-8 py-10">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-[var(--landing-muted)] uppercase tracking-wider">
              Generating your report...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Link href="/training" className="btn-pill">
              Back to Modules
            </Link>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            {/* Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-medium text-[var(--landing-text)]">
                  {report.moduleTitle}
                </h1>
                <p className="text-xs text-[var(--landing-muted)] uppercase tracking-wider mt-1">
                  Module Report &middot; {report.questionCount} questions
                  {report.cached && " &middot; cached"}
                </p>
              </div>
              <button
                onClick={() => fetchReport(true)}
                className="text-xs uppercase tracking-wider border border-[var(--landing-border)] px-3 py-1.5 rounded-sm hover:border-[#0077b6] hover:text-[#0077b6] transition-colors"
              >
                Regenerate
              </button>
            </div>

            {/* Overall Summary */}
            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6 space-y-3">
              <span className="landing-label-inline">Overall Summary</span>
              <p className="text-sm text-[var(--landing-text)] leading-relaxed">
                {report.overallSummary}
              </p>
              <div className="flex gap-4 pt-2">
                <div className="flex-1 border border-[#00b894]/30 bg-[#00b894]/5 rounded-sm px-4 py-3">
                  <p className="text-xs text-[#00b894] uppercase tracking-wider mb-1">
                    Strongest Area
                  </p>
                  <p className="text-sm font-medium text-[var(--landing-text)]">
                    {report.strongestArea.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex-1 border border-amber-400/30 bg-amber-50 rounded-sm px-4 py-3">
                  <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">
                    Needs Work
                  </p>
                  <p className="text-sm font-medium text-[var(--landing-text)]">
                    {report.weakestArea.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Dimension Analysis */}
            <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6 space-y-4">
              <span className="landing-label-inline">Dimension Analysis</span>
              {report.dimensionAnalysis.map((dim) => (
                <DimensionBar key={dim.dimension} {...dim} />
              ))}
            </div>

            {/* KG Suggestions */}
            {report.kgSuggestions.length > 0 && (
              <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6 space-y-3">
                <span className="landing-label-inline">
                  Personalized Suggestions
                </span>
                <p className="text-xs text-[var(--landing-muted)]">
                  Based on your resume and knowledge graph
                </p>
                <div className="space-y-3 pt-1">
                  {report.kgSuggestions.map((s, i) => (
                    <div
                      key={i}
                      className="border border-[var(--landing-border)] rounded-sm px-4 py-3"
                    >
                      <p className="text-xs text-[#0077b6] uppercase tracking-wider mb-1">
                        {s.questionType.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-[var(--landing-text)]">
                        {s.suggestion}
                      </p>
                      {s.referencedExperience && (
                        <p className="text-xs text-[var(--landing-muted)] mt-1">
                          Reference: {s.referencedExperience}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching Tips */}
            {report.coachingTips.length > 0 && (
              <div className="border border-[var(--landing-border)] bg-white rounded-sm p-6 space-y-3">
                <span className="landing-label-inline">Coaching Tips</span>
                <ol className="space-y-2 pt-1">
                  {report.coachingTips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-[#0077b6] font-medium shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-[var(--landing-text)]">{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Per-Question Breakdown */}
            <div className="space-y-2">
              <span className="landing-label-inline">Question Breakdown</span>
              {report.answers.map((ans) => (
                <QuestionAccordion key={ans.questionId} answer={ans} />
              ))}
            </div>

            {/* Back button */}
            <div className="pt-4">
              <Link href="/training" className="btn-pill inline-block">
                &#8592; Back to Modules
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
