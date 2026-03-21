"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { processLetters } from "@/lib/text-formatter";

interface WordBuilderProps {
  onTextReady?: (text: string) => void;
  stabilizedLetter: { letter: string; confidence: number } | null;
}

export function WordBuilder({
  onTextReady,
  stabilizedLetter,
}: WordBuilderProps) {
  const [letters, setLetters] = useState<string[]>([]);
  const [confidences, setConfidences] = useState<number[]>([]);
  const [formattedPreview, setFormattedPreview] = useState("");
  const [isRaw, setIsRaw] = useState(false);

  // Add stabilized letter
  useEffect(() => {
    if (stabilizedLetter) {
      setLetters((prev) => [...prev, stabilizedLetter.letter]);
      setConfidences((prev) => [...prev, stabilizedLetter.confidence]);
    }
  }, [stabilizedLetter]);

  // Update preview whenever letters change
  useEffect(() => {
    const { formatted, isRaw: raw } = processLetters(letters, confidences);
    setFormattedPreview(formatted);
    setIsRaw(raw);
  }, [letters, confidences]);

  const handleBackspace = useCallback(() => {
    setLetters((prev) => prev.slice(0, -1));
    setConfidences((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setLetters([]);
    setConfidences([]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (formattedPreview && onTextReady) {
      onTextReady(formattedPreview);
      setLetters([]);
      setConfidences([]);
    }
  }, [formattedPreview, onTextReady]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Raw letters:</div>
      <div className="font-mono text-lg bg-muted rounded p-2 min-h-[2rem]">
        {letters.join("") || <span className="text-muted-foreground italic">Start signing...</span>}
      </div>

      <div className="text-sm text-muted-foreground">
        Formatted {isRaw && "(low confidence — raw)"}:
      </div>
      <div className="text-lg bg-muted rounded p-2 min-h-[2rem]">
        {formattedPreview || (
          <span className="text-muted-foreground italic">—</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleBackspace}>
          Backspace
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!formattedPreview}>
          Submit
        </Button>
      </div>
    </div>
  );
}
