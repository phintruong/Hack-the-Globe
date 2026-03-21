"use client";

import { useCallback } from "react";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

export function useDrawLandmarks() {
  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[][],
      width: number,
      height: number
    ) => {
      ctx.clearRect(0, 0, width, height);

      for (const hand of landmarks) {
        // Draw connections
        ctx.strokeStyle = "#00b4d8";
        ctx.lineWidth = 2;
        for (const [start, end] of CONNECTIONS) {
          const a = hand[start];
          const b = hand[end];
          ctx.beginPath();
          ctx.moveTo((1 - a.x) * width, a.y * height);
          ctx.lineTo((1 - b.x) * width, b.y * height);
          ctx.stroke();
        }

        // Draw landmarks
        ctx.fillStyle = "#0077b6";
        for (const lm of hand) {
          ctx.beginPath();
          ctx.arc((1 - lm.x) * width, lm.y * height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    },
    []
  );

  return draw;
}
