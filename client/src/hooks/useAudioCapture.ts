"use client";

import { useRef, useState, useCallback } from "react";

export function useAudioCapture(onData: (chunk: Blob) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intentionalStopRef = useRef(false);
  const restartingRef = useRef(false);
  const [recording, setRecording] = useState(false);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    // Prevent concurrent starts
    if (mediaRecorderRef.current || restartingRef.current) return;

    intentionalStopRef.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        onData(e.data);
      }
    };

    recorder.onerror = () => {
      if (!intentionalStopRef.current && !restartingRef.current) {
        restartingRef.current = true;
        console.warn("[audio-capture] error, restarting in 500ms");
        // Clean up current recorder
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((t) => t.stop());
          mediaRecorderRef.current = null;
        }
        setTimeout(async () => {
          restartingRef.current = false;
          try {
            await start();
          } catch (e) {
            console.error("[audio-capture] restart failed:", e);
          }
        }, 500);
      }
    };

    recorder.onstop = () => {
      if (!intentionalStopRef.current && !restartingRef.current) {
        restartingRef.current = true;
        console.warn("[audio-capture] unexpected stop, restarting in 500ms");
        // Clean up tracks from the stopped recorder
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((t) => t.stop());
          mediaRecorderRef.current = null;
        }
        setTimeout(async () => {
          restartingRef.current = false;
          try {
            await start();
          } catch (e) {
            console.error("[audio-capture] restart failed:", e);
          }
        }, 500);
      }
    };

    recorder.start(250); // 250ms chunks
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }, [onData]);

  const restart = useCallback(async () => {
    stop();
    // Small delay to ensure cleanup completes
    await new Promise((r) => setTimeout(r, 100));
    await start();
  }, [stop, start]);

  return { start, stop, restart, recording };
}
