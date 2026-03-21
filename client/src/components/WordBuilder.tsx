"use client";

import { useState, useCallback, useEffect } from "react";
import { processLetters } from "@/lib/text-formatter";
import { getSuggestions } from "@/lib/predictive-text";

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
  const [, setFormattedPreview] = useState("");
  const [, setIsRaw] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [completedWords, setCompletedWords] = useState<string[]>([]);

  // Add stabilized letter
  useEffect(() => {
    if (stabilizedLetter) {
      setLetters((prev) => [...prev, stabilizedLetter.letter]);
      setConfidences((prev) => [...prev, stabilizedLetter.confidence]);
    }
  }, [stabilizedLetter]);

  // Update preview and suggestions whenever letters change
  useEffect(() => {
    const { formatted, isRaw: raw } = processLetters(letters, confidences);
    setFormattedPreview(formatted);
    setIsRaw(raw);

    const currentInput = letters.join("").toLowerCase();
    if (currentInput.length > 0) {
      setSuggestions(getSuggestions(currentInput, 5));
    } else {
      setSuggestions([]);
    }
  }, [letters, confidences]);

  const handleSuggestionClick = useCallback((word: string) => {
    setCompletedWords((prev) => [...prev, word]);
    setLetters([]);
    setConfidences([]);
    setSuggestions([]);
  }, []);

  const handleBackspace = useCallback(() => {
    if (letters.length > 0) {
      setLetters((prev) => prev.slice(0, -1));
      setConfidences((prev) => prev.slice(0, -1));
    } else if (completedWords.length > 0) {
      setCompletedWords((prev) => prev.slice(0, -1));
    }
  }, [letters.length, completedWords.length]);

  // Keyboard backspace support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        // Don't intercept if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBackspace]);

  const handleClear = useCallback(() => {
    setLetters([]);
    setConfidences([]);
    setCompletedWords([]);
    setSuggestions([]);
  }, []);

  const handleSpace = useCallback(() => {
    if (letters.length === 0) return;
    const raw = letters.join("").toLowerCase();
    setCompletedWords((prev) => [...prev, raw]);
    setLetters([]);
    setConfidences([]);
  }, [letters]);

  const handleSubmit = useCallback(() => {
    const remaining = letters.join("").toLowerCase();
    const allWords = [...completedWords];
    if (remaining) allWords.push(remaining);

    const text = allWords.join(" ").trim();
    if (text && onTextReady) {
      onTextReady(text);
      setLetters([]);
      setConfidences([]);
      setCompletedWords([]);
      setSuggestions([]);
    }
  }, [letters, completedWords, onTextReady]);

  const fullPreview = [
    ...completedWords,
    ...(letters.length > 0 ? [letters.join("").toLowerCase()] : []),
  ].join(" ");

  return (
    <div className="space-y-2 text-black">
      {/* Current input */}
      <div className="font-mono text-sm bg-[#caf0f8]/40 rounded-lg p-2.5 min-h-[2rem] flex flex-wrap items-center gap-1 border border-[#ade8f4]">
        {completedWords.map((word, i) => (
          <span
            key={i}
            className="bg-[#0077b6] text-white px-2 py-0.5 rounded text-xs"
          >
            {word}
          </span>
        ))}
        {letters.length > 0 ? (
          <span className="text-black">
            {letters.join("").toLowerCase()}
            <span className="animate-pulse text-[#90e0ef]">|</span>
          </span>
        ) : completedWords.length === 0 ? (
          <span className="text-black/40 italic text-xs">
            Start signing...
          </span>
        ) : null}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((word) => (
            <button
              key={word}
              onClick={() => handleSuggestionClick(word)}
              className="px-2.5 py-1 text-xs bg-[#caf0f8] hover:bg-[#0096c7] text-black hover:text-white rounded-full transition-colors border border-[#ade8f4] hover:border-[#0096c7]"
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={handleBackspace}
          disabled={letters.length === 0 && completedWords.length === 0}
          className="text-xs bg-[#caf0f8] hover:bg-[#ade8f4] text-black px-2.5 py-1.5 rounded transition-colors disabled:opacity-30"
        >
          Bksp
        </button>
        <button
          onClick={handleSpace}
          disabled={letters.length === 0}
          className="text-xs bg-[#caf0f8] hover:bg-[#ade8f4] text-black px-2.5 py-1.5 rounded transition-colors disabled:opacity-30"
        >
          Space
        </button>
        <button
          onClick={handleClear}
          disabled={letters.length === 0 && completedWords.length === 0}
          className="text-xs bg-[#caf0f8] hover:bg-[#ade8f4] text-black px-2.5 py-1.5 rounded transition-colors disabled:opacity-30"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          disabled={!fullPreview}
          className="text-xs bg-[#0077b6] hover:bg-[#023e8a] text-white px-4 py-1.5 rounded transition-colors disabled:opacity-30 ml-auto"
        >
          Send
        </button>
      </div>
    </div>
  );
}
