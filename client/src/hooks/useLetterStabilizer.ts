"use client";

import { useCallback, useRef, useState } from "react";

interface StabilizedResult {
  letter: string;
  confidence: number;
}

const STABILITY_MS = 500;

export function useLetterStabilizer() {
  const [stable, setStable] = useState<StabilizedResult | null>(null);
  const currentLetterRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastConfidenceRef = useRef<number>(0);

  const update = useCallback(
    (letter: string | null, confidence: number) => {
      if (!letter) {
        currentLetterRef.current = null;
        startTimeRef.current = 0;
        return;
      }

      if (letter !== currentLetterRef.current) {
        currentLetterRef.current = letter;
        startTimeRef.current = Date.now();
        lastConfidenceRef.current = confidence;
        return;
      }

      lastConfidenceRef.current = confidence;
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed >= STABILITY_MS) {
        setStable({ letter, confidence });
        // Reset to avoid repeating the same letter continuously
        currentLetterRef.current = null;
        startTimeRef.current = 0;
      }
    },
    []
  );

  return { stable, update };
}
