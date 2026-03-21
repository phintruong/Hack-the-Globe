"use client";

import { useRef, useEffect } from "react";

export interface LogEntry {
  speaker: "interviewer" | "you";
  text: string;
  timestamp: Date;
}

interface ConversationLogProps {
  entries: LogEntry[];
}

export function ConversationLog({ entries }: ConversationLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="max-h-[200px] overflow-y-auto space-y-2 p-2 bg-muted/50 rounded">
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center">
          Conversation will appear here...
        </p>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`text-sm ${
            entry.speaker === "interviewer" ? "text-left" : "text-right"
          }`}
        >
          <span className="text-xs text-muted-foreground uppercase">
            {entry.speaker === "interviewer" ? "Interviewer" : "You"}
          </span>
          <p
            className={`rounded px-3 py-1 inline-block max-w-[80%] ${
              entry.speaker === "interviewer"
                ? "bg-secondary"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {entry.text}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
