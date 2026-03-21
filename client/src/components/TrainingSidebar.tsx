"use client";

import { useState } from "react";
import type { Module } from "@/lib/questions";

interface TrainingSidebarProps {
  modules: Module[];
  activeModuleId: string;
  activeQuestionId: string;
  onSelectQuestion: (moduleId: string, questionId: string) => void;
  getModuleProgress: (moduleId: string) => { completed: number; total: number };
  isQuestionComplete: (questionId: string) => boolean;
}

export function TrainingSidebar({
  modules,
  activeModuleId,
  activeQuestionId,
  onSelectQuestion,
  getModuleProgress,
  isQuestionComplete,
}: TrainingSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(modules.map((m) => m.id))
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-[var(--landing-border)] bg-[var(--landing-bg)] overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs uppercase tracking-wider text-[var(--landing-muted)] mb-4 font-medium">
          Modules
        </h2>

        <div className="space-y-1">
          {modules.map((mod) => {
            const { completed, total } = getModuleProgress(mod.id);
            const isExpanded = expanded.has(mod.id);
            const allDone = completed === total;

            return (
              <div key={mod.id}>
                {/* Module header */}
                <button
                  onClick={() => toggle(mod.id)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-left hover:bg-black/5 transition-colors"
                >
                  <span
                    className={`text-sm font-medium truncate ${
                      allDone ? "text-[#0077b6]" : "text-[var(--landing-text)]"
                    }`}
                  >
                    {mod.title}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs tabular-nums ${
                        allDone
                          ? "text-[#0077b6] font-medium"
                          : "text-[var(--landing-muted)]"
                      }`}
                    >
                      {completed}/{total}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-[var(--landing-muted)] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {/* Question list */}
                {isExpanded && (
                  <div className="ml-1 mt-0.5 space-y-0.5">
                    {mod.questions.map((q) => {
                      const isActive =
                        mod.id === activeModuleId && q.id === activeQuestionId;
                      const isDone = isQuestionComplete(q.id);

                      return (
                        <button
                          key={q.id}
                          onClick={() => onSelectQuestion(mod.id, q.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-sm transition-colors ${
                            isActive
                              ? "bg-[#0077b6]/10 border-l-2 border-[#0077b6] pl-1.5"
                              : "hover:bg-black/5 border-l-2 border-transparent pl-1.5"
                          }`}
                        >
                          {/* Status icon */}
                          {isDone ? (
                            <svg
                              className="w-4 h-4 shrink-0 text-[#0077b6]"
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
                            <div className="w-4 h-4 shrink-0 rounded-full border-2 border-[var(--landing-border)]" />
                          )}
                          <span
                            className={`truncate ${
                              isActive
                                ? "text-[#0077b6] font-medium"
                                : isDone
                                ? "text-[var(--landing-muted)]"
                                : "text-[var(--landing-text)]"
                            }`}
                          >
                            {q.prompt.length > 45
                              ? q.prompt.slice(0, 45) + "..."
                              : q.prompt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
