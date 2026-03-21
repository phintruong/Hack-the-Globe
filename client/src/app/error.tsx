"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#caf0f8] p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#ea4335]/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ea4335">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-black mb-2">Something went wrong</h2>
        <p className="text-sm text-black/60 mb-6">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#0077b6] hover:bg-[#023e8a] text-white text-sm rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
