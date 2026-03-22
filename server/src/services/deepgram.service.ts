import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

function getClient() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  return createClient(key);
}

export function createLiveTranscription(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (error: Error) => void,
  onClose?: () => void,
  onOpen?: () => void
) {
  const deepgram = getClient();
  let open = false;
  let keepAliveId: ReturnType<typeof setInterval> | null = null;
  let keepAliveCount = 0;

  const connection = deepgram.listen.live({
    model: "nova-2",
    language: "en",
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    encoding: "opus",
    sample_rate: 48000,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    open = true;
    console.info("[deepgram] connection opened");

    // Keep-alive every 8s to prevent Deepgram timeout (~10-12s inactivity)
    keepAliveId = setInterval(() => {
      if (open) {
        connection.keepAlive();
        keepAliveCount++;
        if (keepAliveCount % 3 === 0) {
          console.info("[deepgram] keep-alive sent");
        }
      }
    }, 8000);

    onOpen?.();
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (transcript) {
      onTranscript(transcript, data.is_final ?? false);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("[deepgram] error:", err);
    onError(err instanceof Error ? err : new Error(String(err)));
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    const wasOpen = open;
    open = false;
    if (keepAliveId) {
      clearInterval(keepAliveId);
      keepAliveId = null;
    }
    keepAliveCount = 0;

    if (wasOpen) {
      console.warn("[deepgram] connection closed unexpectedly");
    } else {
      console.info("[deepgram] connection closed");
    }

    onClose?.();
  });

  return {
    send: (audio: Buffer) => {
      if (open) {
        connection.send(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength));
      }
    },
    keepAlive: () => {
      connection.keepAlive();
    },
    close: () => {
      open = false;
      if (keepAliveId) {
        clearInterval(keepAliveId);
        keepAliveId = null;
      }
      connection.requestClose();
    },
    isOpen: () => open,
  };
}
