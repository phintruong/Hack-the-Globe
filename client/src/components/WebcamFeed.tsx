"use client";

import React, { useRef, useCallback } from "react";
import Webcam from "react-webcam";

interface WebcamFeedProps {
  onFrame?: (video: HTMLVideoElement) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  className?: string;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export function WebcamFeed({ onFrame, canvasRef, className }: WebcamFeedProps) {
  const webcamRef = useRef<Webcam>(null);
  const animFrameRef = useRef<number>(0);

  const startDetection = useCallback(() => {
    let lastTime = 0;
    const THROTTLE_MS = 600; // ~3 fps
    const loop = (now: number) => {
      if (now - lastTime >= THROTTLE_MS) {
        const video = webcamRef.current?.video;
        if (video && video.readyState >= 2 && onFrame) {
          onFrame(video);
        }
        lastTime = now;
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [onFrame]);

  return (
    <div className={`relative overflow-hidden bg-[#202124] ${className || "w-[640px] h-[480px]"}`}>
      <Webcam
        ref={webcamRef}
        videoConstraints={videoConstraints}
        onUserMedia={startDetection}
        className="absolute inset-0 w-full h-full object-cover"
        mirrored
      />
      {canvasRef && (
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
}
