"use client";

import { Badge } from "@/components/ui/badge";

interface LetterDisplayProps {
  letter: string | null;
  confidence: number;
}

export function LetterDisplay({ letter, confidence }: LetterDisplayProps) {
  if (!letter) {
    return (
      <div className="text-center text-muted-foreground text-sm p-4">
        Show a sign to detect...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <span className="text-6xl font-bold">{letter}</span>
      <Badge variant={confidence >= 60 ? "default" : "secondary"}>
        {confidence}%
      </Badge>
    </div>
  );
}
