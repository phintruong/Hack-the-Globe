"use client";

import { useEffect, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { usePuzzleBuilder } from "@/hooks/usePuzzleBuilder";
import { OptionSelector } from "./OptionSelector";
import { PuzzleWorkspace } from "./PuzzleWorkspace";
import type { QuestionType } from "@/types";

interface PuzzleBuilderProps {
  mode: "training" | "live";
  question: string;
  questionType: QuestionType;
  userId: string;
  socket: Socket | null;
  connected: boolean;
  detectedLetter: string | null;
  onAnswerReady: (answer: string) => void;
  onCancel?: () => void;
}

export function PuzzleBuilder({
  mode,
  question,
  questionType,
  userId,
  socket,
  connected,
  detectedLetter,
  onAnswerReady,
  onCancel,
}: PuzzleBuilderProps) {
  const {
    phase,
    options,
    bankBlocks,
    barBlocks,
    stitchedSegments,
    stitchedText,
    loading,
    error,
    noKG,
    canSubmit,
    generateOptions,
    selectOption,
    moveToBar,
    moveToBank,
    reorderBar,
    reset,
    backToOptions,
  } = usePuzzleBuilder(socket, connected, userId);

  // Generate options on mount
  useEffect(() => {
    if (phase === "idle" && connected) {
      generateOptions(question, questionType);
    }
  }, [phase, connected, question, questionType, generateOptions]);

  // Map ExperienceOption to OptionSelector's AiOption shape
  const aiOptions = options.map((o) => ({
    label: o.label,
    text: `${o.title}: ${o.description}`,
  }));

  const handleOptionSelect = useCallback(
    (opt: { label: string; text: string }) => {
      const match = options.find((o) => o.label === opt.label);
      if (match) {
        selectOption(match, question, questionType);
      }
    },
    [options, selectOption, question, questionType]
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !stitchedText) return;
    onAnswerReady(stitchedText);

    // Analytics
    socket?.emit("puzzle:analytics", {
      event: "answer-submitted",
      blockCount: barBlocks.length,
      timestamp: Date.now(),
    });

    reset();
  }, [canSubmit, stitchedText, onAnswerReady, barBlocks.length, socket, reset]);

  const handleCancel = useCallback(() => {
    socket?.emit("puzzle:analytics", { event: "cancelled", timestamp: Date.now() });
    reset();
    onCancel?.();
  }, [socket, reset, onCancel]);

  // ── Error state ──
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => {
            reset();
            generateOptions(question, questionType);
          }}
          className="text-xs px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Loading options ──
  if (phase === "idle" || loading.options) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-3">
        <span className="inline-block w-5 h-5 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-black/50">
          Generating answer options from your profile...
        </span>
        {onCancel && (
          <button
            onClick={handleCancel}
            className="text-xs text-black/40 hover:text-black/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // ── Phase: options ──
  if (phase === "options") {
    return (
      <div className="space-y-3">
        {noKG && (
          <div className="bg-[#caf0f8] rounded-lg px-3 py-2 text-xs text-[#0077b6]">
            Upload a resume at <span className="font-medium">/profile</span> for personalized blocks.
          </div>
        )}
        <OptionSelector
          options={aiOptions}
          onSelect={handleOptionSelect}
          onDismiss={handleCancel || (() => {})}
          detectedLetter={detectedLetter}
        />
        {loading.blocks && (
          <div className="flex items-center justify-center gap-2 py-3">
            <span className="inline-block w-4 h-4 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-black/50">Generating puzzle blocks...</span>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: building ──
  return (
    <div className="space-y-3">
      {/* Selected option badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#0077b6] text-white px-2 py-0.5 rounded-full font-medium">
            {(bankBlocks.length > 0 || barBlocks.length > 0) && options[0]
              ? options[0].label
              : ""}
          </span>
          <span className="text-xs text-black/50 truncate max-w-[200px]">
            {options[0]?.title}
          </span>
        </div>
        <button
          onClick={backToOptions}
          className="text-[10px] text-[#0077b6] hover:underline"
        >
          Change
        </button>
      </div>

      {noKG && (
        <div className="bg-[#caf0f8] rounded-lg px-3 py-1.5 text-[10px] text-[#0077b6]">
          Generic blocks shown. Upload a resume at /profile for personalized blocks.
        </div>
      )}

      {/* Workspace (DnD, bank, bar, stitch preview) */}
      <PuzzleWorkspace
        bankBlocks={bankBlocks}
        barBlocks={barBlocks}
        stitchedSegments={stitchedSegments}
        isStitching={loading.stitching}
        onMoveToBar={moveToBar}
        onMoveToBank={moveToBank}
        onReorderBar={reorderBar}
      />

      {/* Action row */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[10px] text-black/30">
          {barBlocks.length < 3
            ? `Add ${3 - barBlocks.length} more block${3 - barBlocks.length > 1 ? "s" : ""}`
            : !barBlocks.some((b) => b.category === "action" || b.category === "experience")
            ? "Add an action or experience block"
            : `${barBlocks.length} blocks`}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-[#caf0f8] transition-colors text-black/50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-xs px-5 py-2 bg-[#0077b6] hover:bg-[#023e8a] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            {mode === "training" ? "Submit Answer" : "Send to Interviewer"}
          </button>
        </div>
      </div>
    </div>
  );
}
