"use client";

import { useEffect, useRef } from "react";

const bayerMatrix = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function getThreshold(x: number, y: number) {
  return bayerMatrix[y % 4][x % 4] / 16 - 0.5;
}

export default function DitherCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let time = 0;
    let animId: number;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }

    function draw() {
      ctx!.fillStyle = "#f5f5f5";
      ctx!.fillRect(0, 0, width, height);

      const gridSize = 6;
      const cols = Math.ceil(width / gridSize);
      const rows = Math.ceil(height / gridSize);

      const waveCenterY = rows / 2;
      const waveAmplitude = rows / 4;
      const frequency = 0.05;
      const speed = 0.02;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const wave1 = Math.sin(x * frequency + time) * waveAmplitude;
          const wave2 =
            Math.cos(x * frequency * 0.5 - time) * (waveAmplitude * 0.5);
          const combinedWave = wave1 + wave2;

          const distFromWave = Math.abs(y - (waveCenterY + combinedWave));

          let intensity = Math.max(0, 1 - distFromWave / 15);
          intensity += (Math.random() - 0.5) * 0.1;

          const threshold = getThreshold(x, y);

          if (intensity + threshold > 0.5) {
            ctx!.fillStyle = "#111111";
            ctx!.fillRect(
              x * gridSize,
              y * gridSize,
              gridSize - 1,
              gridSize - 1
            );
          }
        }
      }

      time += speed;
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full z-[1] opacity-60"
    />
  );
}
