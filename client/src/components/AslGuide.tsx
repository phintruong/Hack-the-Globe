"use client";

import { useState } from "react";
import Image from "next/image";
import { SUPPORTED_LETTERS } from "@/lib/asl-gestures";

export function AslGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#0077b6] hover:text-black transition-colors flex items-center gap-1.5"
      >
        <Image
          src="/images/sign-language-asl.png"
          alt="ASL"
          width={18}
          height={18}
          className="opacity-70"
        />
        {expanded ? "Hide" : "ASL Guide"}
      </button>

      {expanded && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#ade8f4] rounded-lg shadow-xl z-50 w-80 max-h-[60vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-[#caf0f8] flex items-center justify-between">
            <span className="text-xs text-black/60 uppercase tracking-wider">
              ASL Manual Alphabet
            </span>
            <span className="text-[10px] text-black/40">
              {SUPPORTED_LETTERS.length} letters
            </span>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {SUPPORTED_LETTERS.map((letter) => (
                <div
                  key={letter}
                  className="relative aspect-square rounded-lg flex flex-col items-center justify-center text-center overflow-hidden bg-[#caf0f8] border border-[#ade8f4]"
                >
                  <Image
                    src={`/images/alphabet/${letter.toLowerCase()}.png`}
                    alt={`ASL letter ${letter}`}
                    fill
                    className="object-contain p-1"
                  />
                  <span className="absolute bottom-0.5 text-[9px] font-bold leading-none text-black">
                    {letter}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-[#caf0f8]">
              <p className="text-[10px] text-black/60 leading-relaxed">
                Hold each hand shape steady facing the camera.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
