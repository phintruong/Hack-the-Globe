"use client";

import React, { useRef, useCallback } from "react";
import Webcam from "react-webcam";

interface WebcamFeedProps {
  onFrame?: (video: HTMLVideoElement) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export function WebcamFeed({ onFrame, canvasRef }: WebcamFeedProps) {
  const webcamRef = useRef<Webcam>(null);
  const animFrameRef = useRef<number>(0);

  const startDetection = useCallback(() => {
    const loop = () => {
      const video = webcamRef.current?.video;
      if (video && video.readyState >= 2 && onFrame) {
        onFrame(video);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [onFrame]);

  return (
    <div className="relative w-[640px] h-[480px] rounded-lg overflow-hidden bg-black">
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
