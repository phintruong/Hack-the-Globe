"use client";

interface PremiumGateProps {
  children: React.ReactNode;
}

export function PremiumGate({ children }: PremiumGateProps) {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-md z-10">
        <div className="text-center px-6 py-4">
          <div className="text-2xl mb-2">🔒</div>
          <p className="font-semibold text-[var(--landing-text)] mb-1">
            Premium Module
          </p>
          <p className="text-sm text-[var(--landing-muted)] mb-4">
            Upgrade to access puzzle questions and advanced modules.
          </p>
          <button className="text-xs uppercase tracking-wider border border-[#0077b6] text-[#0077b6] px-4 py-2 rounded-sm hover:bg-[#0077b6] hover:text-white transition-colors">
            Upgrade to Premium
          </button>
        </div>
      </div>
    </div>
  );
}
