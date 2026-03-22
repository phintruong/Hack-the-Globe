"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type {
  PuzzleBlock,
  ExperienceOption,
  StitchSegment,
  PuzzleError,
  QuestionType,
} from "@/types";

export type PuzzlePhase = "idle" | "options" | "building";

interface LoadingState {
  options: boolean;
  blocks: boolean;
  stitching: boolean;
}

export function usePuzzleBuilder(
  socket: Socket | null,
  connected: boolean,
  userId: string
) {
  const [phase, setPhase] = useState<PuzzlePhase>("idle");
  const [options, setOptions] = useState<ExperienceOption[]>([]);
  const [bankBlocks, setBankBlocks] = useState<PuzzleBlock[]>([]);
  const [barBlocks, setBarBlocks] = useState<PuzzleBlock[]>([]);
  const [stitchedSegments, setStitchedSegments] = useState<StitchSegment[]>([]);
  const [stitchedText, setStitchedText] = useState("");
  const [loading, setLoading] = useState<LoadingState>({ options: false, blocks: false, stitching: false });
  const [error, setError] = useState<string | null>(null);
  const [noKG, setNoKG] = useState(false);

  // Stitch race protection
  const seqRef = useRef(0);
  const stitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;

    const handleOptions = (data: { success: boolean; options?: ExperienceOption[]; noKG?: boolean }) => {
      setLoading((prev) => ({ ...prev, options: false }));
      if (data.success && data.options?.length) {
        setOptions(data.options);
        setPhase("options");
        setNoKG(!!data.noKG);
      }
    };

    const handleBlocks = (data: { success: boolean; blocks?: PuzzleBlock[]; noKG?: boolean }) => {
      setLoading((prev) => ({ ...prev, blocks: false }));
      if (data.success && data.blocks?.length) {
        setBankBlocks(data.blocks);
        setBarBlocks([]);
        setStitchedSegments([]);
        setStitchedText("");
        setPhase("building");
        setNoKG((prev) => prev || !!data.noKG);
      }
    };

    const handleStitched = (data: {
      success: boolean;
      segments?: StitchSegment[];
      fullText?: string;
      seq: number;
    }) => {
      // Ignore stale responses
      if (data.seq < seqRef.current) return;
      setLoading((prev) => ({ ...prev, stitching: false }));
      if (data.success && data.segments) {
        setStitchedSegments(data.segments);
        setStitchedText(data.fullText || "");
      }
    };

    const handleError = (data: PuzzleError) => {
      if (!data.fallbackUsed) {
        setError(data.message);
      }
      // If fallbackUsed, the data was already sent via the main event — just toast
      console.warn(`[puzzle:error] ${data.event}: ${data.message} (fallback: ${data.fallbackUsed})`);
    };

    socket.on("puzzle:options", handleOptions);
    socket.on("puzzle:blocks", handleBlocks);
    socket.on("puzzle:stitched", handleStitched);
    socket.on("puzzle:error", handleError);

    return () => {
      socket.off("puzzle:options", handleOptions);
      socket.off("puzzle:blocks", handleBlocks);
      socket.off("puzzle:stitched", handleStitched);
      socket.off("puzzle:error", handleError);
    };
  }, [socket]);

  // ── Debounced stitch on barBlocks change ──
  useEffect(() => {
    if (barBlocks.length < 2 || !socket || !connected) {
      // Don't clear existing stitch for 1 block (keep last valid)
      if (barBlocks.length === 0) {
        setStitchedSegments([]);
        setStitchedText("");
      }
      return;
    }

    if (stitchTimerRef.current) clearTimeout(stitchTimerRef.current);

    stitchTimerRef.current = setTimeout(() => {
      const seq = ++seqRef.current;
      setLoading((prev) => ({ ...prev, stitching: true }));
      socket.emit("puzzle:stitch", {
        blocks: barBlocks.map((b) => ({ id: b.id, text: b.text })),
        seq,
      });
    }, 400);

    return () => {
      if (stitchTimerRef.current) clearTimeout(stitchTimerRef.current);
    };
  }, [barBlocks, socket, connected]);

  // ── Actions ──
  const generateOptions = useCallback(
    (question: string, questionType: QuestionType) => {
      if (!socket || !connected) return;
      setError(null);
      setLoading((prev) => ({ ...prev, options: true }));
      socket.emit("puzzle:generate-options", { userId, question, questionType });
    },
    [socket, connected, userId]
  );

  const selectOption = useCallback(
    (option: ExperienceOption, question: string, questionType: QuestionType) => {
      if (!socket || !connected) return;
      setError(null);
      setLoading((prev) => ({ ...prev, blocks: true }));
      socket.emit("puzzle:generate-blocks", {
        userId,
        question,
        selectedOption: option,
        questionType,
      });

      // Analytics
      socket.emit("puzzle:analytics", {
        event: "option-selected",
        label: option.label,
        timestamp: Date.now(),
      });
    },
    [socket, connected, userId]
  );

  const moveToBar = useCallback(
    (blockId: string, index?: number) => {
      setBankBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setBarBlocks((prev) => {
        const block = bankBlocks.find((b) => b.id === blockId);
        if (!block) return prev;
        if (prev.some((b) => b.id === blockId)) return prev; // no duplicates
        const next = [...prev];
        if (index !== undefined) {
          next.splice(index, 0, block);
        } else {
          next.push(block);
        }

        // Analytics
        socket?.emit("puzzle:analytics", {
          event: "block-added",
          blockId,
          category: block.category,
          barSize: next.length,
          timestamp: Date.now(),
        });

        return next;
      });
    },
    [bankBlocks, socket]
  );

  const moveToBank = useCallback(
    (blockId: string) => {
      setBarBlocks((prev) => prev.filter((b) => b.id !== blockId));
      const block = barBlocks.find((b) => b.id === blockId);
      if (block) {
        setBankBlocks((prev) => (prev.some((b) => b.id === blockId) ? prev : [...prev, block]));
      }
    },
    [barBlocks]
  );

  const reorderBar = useCallback(
    (fromIndex: number, toIndex: number) => {
      setBarBlocks((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setOptions([]);
    setBankBlocks([]);
    setBarBlocks([]);
    setStitchedSegments([]);
    setStitchedText("");
    setLoading({ options: false, blocks: false, stitching: false });
    setError(null);
    setNoKG(false);
    seqRef.current = 0;
    if (stitchTimerRef.current) clearTimeout(stitchTimerRef.current);
  }, []);

  const backToOptions = useCallback(() => {
    setBankBlocks([]);
    setBarBlocks([]);
    setStitchedSegments([]);
    setStitchedText("");
    setLoading((prev) => ({ ...prev, blocks: false, stitching: false }));
    setPhase("options");
  }, []);

  // Check minimum viable answer: ≥3 blocks with at least 1 action or experience
  const canSubmit =
    barBlocks.length >= 3 &&
    barBlocks.some((b) => b.category === "action" || b.category === "experience") &&
    !loading.stitching;

  return {
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
    setBarBlocks,
    reset,
    backToOptions,
  };
}
