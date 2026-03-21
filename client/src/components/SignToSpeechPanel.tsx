"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextFallbackInput } from "./TextFallbackInput";
import { WordBuilder } from "./WordBuilder";
import type { Socket } from "socket.io-client";

interface SignToSpeechPanelProps {
  socket: Socket | null;
  connected: boolean;
  stabilizedLetter: { letter: string; confidence: number } | null;
}

export function SignToSpeechPanel({
  socket,
  connected,
  stabilizedLetter,
}: SignToSpeechPanelProps) {
  const [status, setStatus] = useState<
    "idle" | "converting" | "speaking"
  >("idle");
  const [polishedPreview, setPolishedPreview] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("live:polished-preview", (data: { polished: string }) => {
      setPolishedPreview(data.polished);
      setStatus("converting");
    });

    socket.on(
      "live:audio-chunk",
      (data: { audio: string; mimeType: string }) => {
        setStatus("speaking");
        const bytes = atob(data.audio);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          arr[i] = bytes.charCodeAt(i);
        }
        const blob = new Blob([arr], { type: data.mimeType });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
        audio.play();
      }
    );

    return () => {
      socket.off("live:polished-preview");
      socket.off("live:audio-chunk");
    };
  }, [socket]);

  const sendText = useCallback(
    (text: string) => {
      if (!socket || !connected || !text.trim()) return;
      setStatus("converting");
      setPolishedPreview("");
      socket.emit("live:sign-text", { text: text.trim() });
    },
    [socket, connected]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Your Response</CardTitle>
        {status !== "idle" && (
          <Badge variant="secondary">
            {status === "converting" ? "Converting..." : "Speaking..."}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <WordBuilder
          stabilizedLetter={stabilizedLetter}
          onTextReady={sendText}
        />

        {polishedPreview && (
          <div className="bg-muted rounded p-2 text-sm">
            <span className="text-muted-foreground text-xs">Polished: </span>
            {polishedPreview}
          </div>
        )}

        <div className="border-t pt-4">
          <TextFallbackInput onSubmit={sendText} placeholder="Type to speak..." />
        </div>
      </CardContent>
    </Card>
  );
}
