"use client";

import { useState, useCallback, useEffect } from "react";
import { MODULES } from "@/lib/questions";

const STORAGE_KEY = "univoice-training-progress";

interface QuestionResult {
  bestScore: number;
  completedAt: string;
}

interface TrainingProgress {
  completed: Record<string, QuestionResult>;
}

function load(): TrainingProgress {
  if (typeof window === "undefined") return { completed: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TrainingProgress;
  } catch {}
  return { completed: {} };
}

function save(progress: TrainingProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useTrainingProgress() {
  const [progress, setProgress] = useState<TrainingProgress>({ completed: {} });

  useEffect(() => {
    setProgress(load());
  }, []);

  const markComplete = useCallback(
    (questionId: string, scores: { situation: number; task: number; action: number; result: number }) => {
      setProgress((prev) => {
        const avg = Math.round((scores.situation + scores.task + scores.action + scores.result) / 4);
        const existing = prev.completed[questionId];
        const best = existing ? Math.max(existing.bestScore, avg) : avg;
        const next: TrainingProgress = {
          completed: {
            ...prev.completed,
            [questionId]: { bestScore: best, completedAt: new Date().toISOString() },
          },
        };
        save(next);
        return next;
      });
    },
    []
  );

  const isQuestionComplete = useCallback(
    (questionId: string) => questionId in progress.completed,
    [progress]
  );

  const getModuleProgress = useCallback(
    (moduleId: string) => {
      const mod = MODULES.find((m) => m.id === moduleId);
      if (!mod) return { completed: 0, total: 0 };
      const completed = mod.questions.filter((q) => q.id in progress.completed).length;
      return { completed, total: mod.questions.length };
    },
    [progress]
  );

  const resetProgress = useCallback(() => {
    const empty: TrainingProgress = { completed: {} };
    save(empty);
    setProgress(empty);
  }, []);

  return { progress, markComplete, isQuestionComplete, getModuleProgress, resetProgress };
}
