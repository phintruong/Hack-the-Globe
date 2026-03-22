"use client";

type TranscriptionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

interface ClosedCaptionsProps {
  interimText: string;
  recentFinals: { text: string; timestamp: number }[];
  sttState: TranscriptionState;
  silenceDuration: number;
  onRetry?: () => void;
}

export function ClosedCaptions({
  interimText,
  recentFinals,
  sttState,
  silenceDuration,
  onRetry,
}: ClosedCaptionsProps) {
  // Only show last 3 finals
  const visibleFinals = recentFinals.slice(-3);
  const hasContent = interimText || visibleFinals.length > 0;

  // Status dot color + label
  const statusConfig: Record<
    TranscriptionState,
    { color: string; pulse: boolean; label: string }
  > = {
    idle: { color: "bg-gray-400", pulse: false, label: "Captions off" },
    connecting: { color: "bg-blue-400", pulse: true, label: "Connecting..." },
    connected: { color: "bg-green-400", pulse: false, label: "Live" },
    reconnecting: {
      color: "bg-yellow-400",
      pulse: true,
      label: "Reconnecting...",
    },
    failed: { color: "bg-red-400", pulse: false, label: "Unavailable" },
  };

  const status = statusConfig[sttState];

  // Border style for reconnecting state
  const borderClass =
    sttState === "reconnecting"
      ? "border-2 border-yellow-400/60 animate-pulse"
      : "border border-transparent";

  if (sttState === "idle") return null;

  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10
        bg-black/75 backdrop-blur-sm rounded-xl px-6 py-3
        min-h-[60px] max-w-[80%] w-fit min-w-[300px]
        flex flex-col items-center justify-center gap-1
        ${borderClass} transition-all duration-300`}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-3 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {status.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${status.color}`}
          />
        </span>
        <span className="text-[10px] text-white/50">{status.label}</span>
      </div>

      {/* Connecting state */}
      {sttState === "connecting" && (
        <p className="text-sm text-white/60">Starting live captions...</p>
      )}

      {/* Reconnecting state */}
      {sttState === "reconnecting" && (
        <p className="text-sm text-yellow-300/80">
          Reconnecting captions...
        </p>
      )}

      {/* Failed state */}
      {sttState === "failed" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-red-300">Captions unavailable</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              Click to retry
            </button>
          )}
        </div>
      )}

      {/* Connected state: transcripts */}
      {sttState === "connected" && (
        <>
          {hasContent ? (
            <div className="w-full text-center space-y-0.5">
              {visibleFinals.map((f, i) => {
                const age = Date.now() - f.timestamp;
                const opacity =
                  i === visibleFinals.length - 1
                    ? "text-white"
                    : age > 5000
                      ? "text-white/40"
                      : "text-white/60";
                return (
                  <p
                    key={f.timestamp}
                    className={`text-lg font-medium leading-snug ${opacity} transition-opacity duration-500`}
                  >
                    {f.text}
                  </p>
                );
              })}
              {interimText && (
                <p className="text-base italic text-white/70 leading-snug">
                  {interimText}
                </p>
              )}
            </div>
          ) : silenceDuration > 5000 ? (
            <p className="text-sm text-white/40">
              No audio detected &mdash; is your mic on?
            </p>
          ) : (
            <p className="text-sm text-white/40">Listening...</p>
          )}
        </>
      )}
    </div>
  );
}
