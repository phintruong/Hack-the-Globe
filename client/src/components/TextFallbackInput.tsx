"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface TextFallbackInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
}

export function TextFallbackInput({
  onSubmit,
  placeholder = "Type your answer here...",
}: TextFallbackInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  }, [text, onSubmit]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Text Input (Fallback)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button onClick={handleSubmit} disabled={!text.trim()} className="w-full">
        Submit Text
      </Button>
    </div>
  );
}
