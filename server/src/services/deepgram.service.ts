import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

function getClient() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  return createClient(key);
}

export function createLiveTranscription(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (error: Error) => void
) {
  const deepgram = getClient();
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
    console.log("Deepgram connection opened");
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (transcript) {
      onTranscript(transcript, data.is_final ?? false);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("Deepgram error:", err);
    onError(err instanceof Error ? err : new Error(String(err)));
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram connection closed");
  });

  return {
    send: (audio: Buffer) => {
      connection.send(audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength));
    },
    keepAlive: () => {
      connection.keepAlive();
    },
    close: () => {
      connection.requestClose();
    },
  };
}
