"use client";

import { useRef, useCallback, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface SpeechRecognitionCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onTranscript, onError }: SpeechRecognitionCallbacks) {
  const recognitionRef = useRef<any>(null);
  const [active, setActive] = useState(false);

  const w = typeof window !== "undefined" ? (window as unknown as IWindow) : null;
  const supported = !!(w && (w.SpeechRecognition || w.webkitSpeechRecognition));

  const start = useCallback(() => {
    if (!supported || !w) {
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          onTranscript(result[0].transcript.trim(), true);
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        onTranscript(interim, false);
      }
    };

    recognition.onerror = (event: any) => {
      onError?.(event.error);
    };

    recognition.onend = () => {
      // Restart if still active (browser stops after silence)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already started
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setActive(true);
  }, [supported, w, onTranscript, onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setActive(false);
  }, []);

  return { start, stop, active, supported };
}
