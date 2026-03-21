"use client";

import { useRef, useState, useCallback } from "react";

export function useAudioCapture(onData: (chunk: Blob) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        onData(e.data);
      }
    };

    recorder.start(250); // 250ms chunks
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }, [onData]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  }, []);

  return { start, stop, recording };
}
