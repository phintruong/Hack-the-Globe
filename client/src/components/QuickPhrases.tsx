"use client";

import { Button } from "@/components/ui/button";
import type { Socket } from "socket.io-client";

const PHRASES = [
  "Yes, that's correct.",
  "Could you repeat that please?",
  "I have a question about that.",
  "Thank you for the opportunity.",
  "I need a moment to think.",
];

interface QuickPhrasesProps {
  socket: Socket | null;
  connected: boolean;
}

export function QuickPhrases({ socket, connected }: QuickPhrasesProps) {
  const sendPhrase = (text: string) => {
    if (socket && connected) {
      socket.emit("live:quick-phrase", { text });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PHRASES.map((phrase) => (
        <Button
          key={phrase}
          variant="outline"
          size="sm"
          onClick={() => sendPhrase(phrase)}
          disabled={!connected}
        >
          {phrase}
        </Button>
      ))}
    </div>
  );
}
