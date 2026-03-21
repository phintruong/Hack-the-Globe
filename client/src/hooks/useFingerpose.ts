"use client";

import { useCallback, useRef } from "react";
import fp from "fingerpose";
import { ASL_GESTURES } from "@/lib/asl-gestures";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface GestureResult {
  letter: string;
  confidence: number;
}

function toLandmarkArray(landmarks: Landmark[]): number[][] {
  return landmarks.map((lm) => [lm.x, lm.y, lm.z]);
}

export function useFingerpose() {
  const estimatorRef = useRef<InstanceType<typeof fp.GestureEstimator> | null>(null);

  if (!estimatorRef.current) {
    estimatorRef.current = new fp.GestureEstimator(ASL_GESTURES);
  }

  const estimate = useCallback(
    (landmarks: Landmark[]): GestureResult | null => {
      if (!estimatorRef.current) return null;

      const converted = toLandmarkArray(landmarks);
      const result = estimatorRef.current.estimate(converted, 6.0);

      if (!result.gestures || result.gestures.length === 0) return null;

      // Pick highest scoring gesture
      const best = result.gestures.reduce(
        (prev: { name: string; score: number }, curr: { name: string; score: number }) =>
          curr.score > prev.score ? curr : prev
      );

      return {
        letter: best.name.toUpperCase(),
        confidence: Math.round((best.score / 10) * 100),
      };
    },
    []
  );

  return { estimate };
}
