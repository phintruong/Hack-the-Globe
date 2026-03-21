"use client";

import { Badge } from "@/components/ui/badge";

interface DemoModeToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function DemoModeToggle({ enabled, onToggle }: DemoModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1 rounded-md border hover:bg-accent transition-colors"
    >
      <span className="text-sm">Demo Mode</span>
      <Badge variant={enabled ? "default" : "outline"}>
        {enabled ? "ON" : "OFF"}
      </Badge>
    </button>
  );
}
