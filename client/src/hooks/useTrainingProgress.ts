"use client";

import { useState, useCallback, useEffect } from "react";
import type { ApiModule } from "@/types/index";

const STORAGE_KEY = "univoice-training-progress";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

interface QuestionResult {
  bestScore: number;
  completedAt: string;
}

interface TrainingProgress {
  completed: Record<string, QuestionResult>;
}

function loadLocal(): TrainingProgress {
  if (typeof window === "undefined") return { completed: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrainingProgress;
  } catch {}
  return { completed: {} };
}

function saveLocal(progress: TrainingProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useTrainingProgress(userId?: string, modules?: ApiModule[]) {
  const [progress, setProgress] = useState<TrainingProgress>({ completed: {} });

  // Load from localStorage first, then sync from API if user is logged in
  useEffect(() => {
    const local = loadLocal();
    setProgress(local);

    if (!userId) return;

    fetch(`${SERVER_URL}/api/progress/${userId}`)
      .then((r) => r.json())
      .then(
        (rows: { question_id: string; best_score: number; completed_at: string }[]) => {
          if (!Array.isArray(rows)) return;
          const merged: TrainingProgress = { completed: { ...local.completed } };
          for (const row of rows) {
            const existing = merged.completed[row.question_id];
            if (!existing || row.best_score > existing.bestScore) {
              merged.completed[row.question_id] = {
                bestScore: row.best_score,
                completedAt: row.completed_at,
              };
            }
          }
          saveLocal(merged);
          setProgress(merged);
        }
      )
      .catch(() => {
        // API unavailable, keep localStorage data
      });
  }, [userId]);

  const markComplete = useCallback(
    (
      questionId: string,
      scores: { situation: number; task: number; action: number; result: number }
    ) => {
      const avg = Math.round(
        (scores.situation + scores.task + scores.action + scores.result) / 4
      );

      setProgress((prev) => {
        const existing = prev.completed[questionId];
        const best = existing ? Math.max(existing.bestScore, avg) : avg;
        const next: TrainingProgress = {
          completed: {
            ...prev.completed,
            [questionId]: { bestScore: best, completedAt: new Date().toISOString() },
          },
        };
        saveLocal(next);

        // Best-effort API sync
        if (userId) {
          fetch(`${SERVER_URL}/api/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, questionId, score: avg }),
          }).catch(() => {});
        }

        return next;
      });
    },
    [userId]
  );

  const isQuestionComplete = useCallback(
    (questionId: string) => questionId in progress.completed,
    [progress]
  );

  const getModuleProgress = useCallback(
    (moduleId: string) => {
      // Use passed ApiModule array if available, fall back to MODULES
      const mod = modules?.find((m) => m.id === moduleId);
      if (!mod) return { completed: 0, total: 0 };
      const completed = mod.questions.filter((q) => q.id in progress.completed).length;
      return { completed, total: mod.questions.length };
    },
    [progress, modules]
  );

  const resetProgress = useCallback(() => {
    const empty: TrainingProgress = { completed: {} };
    saveLocal(empty);
    setProgress(empty);
  }, []);

  return { progress, markComplete, isQuestionComplete, getModuleProgress, resetProgress };
}
