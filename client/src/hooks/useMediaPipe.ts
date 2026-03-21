"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface HandResult {
  landmarks: { x: number; y: number; z: number }[][];
  handedness: { categoryName: string }[][];
}

export function useMediaPipe() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handLandmarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const lastTimeRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Dynamic import to avoid webpack module resolution issues
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await vision.HandLandmarker.createFromOptions(
        fileset,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        }
      );
      if (!cancelled) {
        handLandmarkerRef.current = handLandmarker;
        setReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const detect = useCallback(
    (video: HTMLVideoElement): HandResult | null => {
      if (!handLandmarkerRef.current || !ready) return null;
      const now = performance.now();
      if (now <= lastTimeRef.current) return null;
      lastTimeRef.current = now;

      const result = handLandmarkerRef.current.detectForVideo(video, now);
      if (!result.landmarks.length) return null;

      return {
        landmarks: result.landmarks,
        handedness: result.handednesses as { categoryName: string }[][],
      };
    },
    [ready]
  );

  return { detect, ready };
}
