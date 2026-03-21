"use client";

interface TranscriptEntry {
  text: string;
  isFinal: boolean;
}

interface TranscriptDisplayProps {
  entries: TranscriptEntry[];
  interimText: string;
}

export function TranscriptDisplay({
  entries,
  interimText,
}: TranscriptDisplayProps) {
  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {entries.map((entry, i) => (
        <p key={i} className="text-sm">
          {entry.text}
        </p>
      ))}
      {interimText && (
        <p className="text-sm text-muted-foreground italic">{interimText}</p>
      )}
      {entries.length === 0 && !interimText && (
        <p className="text-sm text-muted-foreground italic">
          Waiting for speech...
        </p>
      )}
    </div>
  );
}
