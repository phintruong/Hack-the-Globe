"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import type { Socket } from "socket.io-client";

interface TranscriptEntry {
  text: string;
  isFinal: boolean;
}

interface SpeechToTextPanelProps {
  socket: Socket | null;
  connected: boolean;
  onFinalTranscript?: (text: string) => void;
}

export function SpeechToTextPanel({
  socket,
  connected,
  onFinalTranscript,
}: SpeechToTextPanelProps) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [listening, setListening] = useState(false);
  const listenersSetup = useRef(false);

  const setupListeners = useCallback(() => {
    if (!socket || listenersSetup.current) return;
    listenersSetup.current = true;

    socket.on(
      "live:transcript",
      (data: { text: string; isFinal: boolean }) => {
        if (data.isFinal) {
          setEntries((prev) => [...prev, { text: data.text, isFinal: true }]);
          setInterimText("");
          onFinalTranscript?.(data.text);
        } else {
          setInterimText(data.text);
        }
      }
    );
  }, [socket, onFinalTranscript]);

  const onAudioData = useCallback(
    (chunk: Blob) => {
      if (socket && connected) {
        chunk.arrayBuffer().then((buf) => {
          socket.emit("live:audio-in", buf);
        });
      }
    },
    [socket, connected]
  );

  const { start, stop } = useAudioCapture(onAudioData);

  const toggleListening = useCallback(async () => {
    if (listening) {
      stop();
      socket?.emit("live:stop-listening");
      setListening(false);
    } else {
      setupListeners();
      socket?.emit("live:start-listening");
      await start();
      setListening(true);
    }
  }, [listening, socket, start, stop, setupListeners]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Interviewer Speech</CardTitle>
        {listening && <Badge variant="default">Listening...</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <TranscriptDisplay entries={entries} interimText={interimText} />
        <Button
          onClick={toggleListening}
          disabled={!connected}
          variant={listening ? "destructive" : "default"}
          className="w-full"
        >
          {listening ? "Stop Listening" : "Start Listening"}
        </Button>
      </CardContent>
    </Card>
  );
}
