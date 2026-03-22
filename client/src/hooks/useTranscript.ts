"use client";

import { useState, useCallback } from "react";
import type { TranscriptSegment } from "@/types/index";

const SESSION_KEY = "univoice-live-session-id";

export function useTranscript() {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initSession = useCallback((id: string) => {
    setSessionId(id);
    sessionStorage.setItem(SESSION_KEY, id);
    setSegments([]);
    setInterimText("");
  }, []);

  const restoreSession = useCallback((id: string, restoredSegments: TranscriptSegment[]) => {
    setSessionId(id);
    sessionStorage.setItem(SESSION_KEY, id);
    setSegments(restoredSegments);
  }, []);

  const addSegment = useCallback((segment: TranscriptSegment) => {
    setSegments((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.id === segment.id)) return prev;
      return [...prev, segment];
    });
  }, []);

  const updateSegmentTranslation = useCallback(
    (segmentId: string, translatedText: string) => {
      setSegments((prev) =>
        prev.map((s) => (s.id === segmentId ? { ...s, translated_text: translatedText } : s))
      );
    },
    []
  );

  const clearSession = useCallback(() => {
    setSessionId(null);
    setSegments([]);
    setInterimText("");
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const getSavedSessionId = () => sessionStorage.getItem(SESSION_KEY);

  return {
    segments,
    interimText,
    setInterimText,
    sessionId,
    initSession,
    restoreSession,
    addSegment,
    updateSegmentTranslation,
    clearSession,
    getSavedSessionId,
  };
}
