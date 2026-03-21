"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface AiOption {
  label: string;
  text: string;
}

interface OptionSelectorProps {
  options: AiOption[];
  onSelect: (option: AiOption) => void;
  onDismiss: () => void;
  detectedLetter: string | null;
  /** Whether a selection is currently being confirmed (0.5s delay) */
  loading?: boolean;
}

const GESTURE_HINTS: Record<string, string> = {
  A: "Fist, thumb beside",
  B: "Flat hand, fingers up",
  C: "Curved hand, like holding a cup",
  D: "Index up, others touch thumb",
};

const CONFIRM_DELAY_MS = 500;

export function OptionSelector({
  options,
  onSelect,
  onDismiss,
  detectedLetter,
}: OptionSelectorProps) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When detected letter matches an option, start confirmation timer
  useEffect(() => {
    const matchLabels = options.map((o) => o.label);

    if (detectedLetter && matchLabels.includes(detectedLetter)) {
      if (pendingLabel === detectedLetter) return; // already pending
      // New detection — start confirm delay
      setPendingLabel(detectedLetter);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const match = options.find((o) => o.label === detectedLetter);
        if (match) {
          setConfirmedLabel(detectedLetter);
          onSelect(match);
        }
        setPendingLabel(null);
      }, CONFIRM_DELAY_MS);
    } else {
      // Letter changed or lost — cancel pending
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingLabel(null);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLetter]);

  // Reset confirmed state when options change
  useEffect(() => {
    setConfirmedLabel(null);
    setPendingLabel(null);
  }, [options]);

  const handleClick = useCallback(
    (opt: AiOption) => {
      setConfirmedLabel(opt.label);
      onSelect(opt);
    },
    [onSelect]
  );

  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Instruction banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0077b6] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0077b6]" />
          </span>
          <span className="text-xs text-[#0077b6] uppercase tracking-wider font-semibold">
            Sign A / B / C / D to choose your answer
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-[10px] text-black/40 hover:text-black/60 px-2 py-1 rounded hover:bg-black/5 transition-colors"
        >
          dismiss
        </button>
      </div>

      {/* Detected gesture feedback */}
      {detectedLetter && ["A", "B", "C", "D"].includes(detectedLetter) && (
        <div
          className={`text-center py-1.5 rounded-lg text-sm font-medium transition-all ${
            pendingLabel
              ? "bg-[#0077b6]/10 text-[#0077b6] border border-[#0077b6]/30"
              : "bg-[#caf0f8] text-black/60"
          }`}
        >
          {pendingLabel ? (
            <>
              Selecting option{" "}
              <span className="font-bold">{pendingLabel}</span>
              <span className="ml-1 inline-block w-3 h-3 border-2 border-[#0077b6] border-t-transparent rounded-full animate-spin align-middle" />
            </>
          ) : (
            <>
              Detected: <span className="font-bold">{detectedLetter}</span>
            </>
          )}
        </div>
      )}

      {/* Option cards */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isPending = pendingLabel === opt.label;
          const isConfirmed = confirmedLabel === opt.label;

          return (
            <button
              key={opt.label}
              onClick={() => handleClick(opt)}
              disabled={!!confirmedLabel}
              className={`relative flex gap-2.5 items-start p-3 rounded-xl border-2 transition-all text-left group ${
                isConfirmed
                  ? "border-[#0077b6] bg-[#0077b6]/10 scale-[0.98]"
                  : isPending
                  ? "border-[#0077b6]/50 bg-[#caf0f8]/60 scale-[1.01]"
                  : "border-[#ade8f4] hover:border-[#0077b6] hover:bg-[#caf0f8]/40"
              } disabled:cursor-default`}
            >
              {/* Label badge */}
              <span
                className={`shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center transition-colors ${
                  isConfirmed || isPending
                    ? "bg-[#023e8a]"
                    : "bg-[#0077b6] group-hover:bg-[#023e8a]"
                }`}
              >
                {opt.label}
              </span>

              <div className="flex-1 min-w-0">
                <span className="text-sm text-black/80 leading-snug block">
                  {opt.text}
                </span>
                <span className="text-[10px] text-black/30 mt-1 block">
                  {GESTURE_HINTS[opt.label] || `Sign ${opt.label}`}
                </span>
              </div>

              {/* Confirmed check */}
              {isConfirmed && (
                <span className="absolute top-2 right-2 text-[#0077b6]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fallback click hint */}
      <p className="text-[10px] text-black/30 text-center">
        You can also click an option or type in the chat
      </p>
    </div>
  );
}
