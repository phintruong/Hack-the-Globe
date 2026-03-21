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
        className="text-xs text-[#0077b6] hover:text-[#023e8a] transition-colors flex items-center gap-1.5"
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
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#ade8f4] rounded-lg shadow-xl z-20 w-80 max-h-[70vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-[#caf0f8] flex items-center justify-between">
            <span className="text-xs text-[#023e8a]/60 uppercase tracking-wider">
              ASL Manual Alphabet
            </span>
            <span className="text-[10px] text-[#023e8a]/40">
              {SUPPORTED_LETTERS.length} letters &middot; J &amp; Z need motion
            </span>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-6 gap-1.5">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
                const supported = SUPPORTED_LETTERS.includes(letter);
                return (
                  <div
                    key={letter}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-center ${
                      supported
                        ? "bg-[#caf0f8] border border-[#ade8f4]"
                        : "bg-[#caf0f8]/30 border border-[#ade8f4]/30 opacity-40"
                    }`}
                  >
                    <span className="text-2xl leading-none mb-0.5">
                      {HAND_ICONS[letter] || "\u270a"}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        supported ? "text-[#03045e]" : "text-[#023e8a]/40"
                      }`}
                    >
                      {letter}
                    </span>
                    {!supported && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] text-[#023e8a]/60 bg-white/90 px-1 rounded">
                          motion
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-2 border-t border-[#caf0f8]">
              <p className="text-[10px] text-[#023e8a]/60 leading-relaxed">
                Hold each hand shape steady facing the camera. Letters J and Z
                require motion and are not supported.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HAND_ICONS: Record<string, string> = {
  A: "\u270a",
  B: "\ud83e\udd1a",
  C: "\ud83e\udef2",
  D: "\u261d\ufe0f",
  E: "\u270a",
  F: "\ud83d\udc4c",
  G: "\ud83d\udc48",
  H: "\ud83d\udc48",
  I: "\ud83e\udd19",
  J: "\ud83e\udd19",
  K: "\u270c\ufe0f",
  L: "\ud83e\udd1f",
  M: "\u270a",
  N: "\u270a",
  O: "\ud83d\udc4c",
  P: "\ud83d\udc47",
  Q: "\ud83d\udc47",
  R: "\u270c\ufe0f",
  S: "\u270a",
  T: "\u270a",
  U: "\u270c\ufe0f",
  V: "\u270c\ufe0f",
  W: "\ud83e\udd1f",
  X: "\u261d\ufe0f",
  Y: "\ud83e\udd19",
  Z: "\u261d\ufe0f",
};
