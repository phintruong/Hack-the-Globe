"use client";

import { useRef, useState, useEffect } from "react";
import type { BlockCategory } from "@/types";

interface PuzzlePieceProps {
  text: string;
  category: BlockCategory;
  position: "first" | "middle" | "last" | "only";
  isDragging?: boolean;
  isInBar?: boolean;
  onRemove?: () => void;
}

const CATEGORY_COLORS: Record<BlockCategory, { fill: string; text: string }> = {
  skill: { fill: "#0077b6", text: "#ffffff" },
  action: { fill: "#023e8a", text: "#ffffff" },
  metric: { fill: "#00b4d8", text: "#ffffff" },
  context: { fill: "#90e0ef", text: "#023e8a" },
  experience: { fill: "#48cae4", text: "#023e8a" },
};

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  skill: "Skill",
  action: "Action",
  metric: "Metric",
  context: "Context",
  experience: "Exp",
};

const TAB_RADIUS = 10;
const PIECE_HEIGHT = 44;
const MIN_WIDTH = 64;
const MAX_WIDTH = 200;
const PADDING_X = 16;

/**
 * Build SVG path for a horizontal jigsaw piece.
 * - Right edge: outward tab (semicircle) unless "last" or "only"
 * - Left edge: inward slot (semicircle indent) unless "first" or "only"
 * - Top/bottom: always flat
 */
function buildPath(
  w: number,
  h: number,
  position: PuzzlePieceProps["position"]
): string {
  const hasLeftSlot = position === "middle" || position === "last";
  const hasRightTab = position === "first" || position === "middle";
  const r = TAB_RADIUS;
  const midY = h / 2;
  const cr = 4; // corner radius

  const parts: string[] = [];

  // Start at top-left
  parts.push(`M ${cr} 0`);
  // Top edge
  parts.push(`L ${w - cr} 0`);
  parts.push(`Q ${w} 0 ${w} ${cr}`);

  // Right edge
  if (hasRightTab) {
    // Down to tab start
    parts.push(`L ${w} ${midY - r}`);
    // Tab: semicircle outward (to the right)
    parts.push(`A ${r} ${r} 0 1 1 ${w} ${midY + r}`);
    // Down to bottom
    parts.push(`L ${w} ${h - cr}`);
  } else {
    parts.push(`L ${w} ${h - cr}`);
  }

  // Bottom-right corner
  parts.push(`Q ${w} ${h} ${w - cr} ${h}`);
  // Bottom edge
  parts.push(`L ${cr} ${h}`);
  // Bottom-left corner
  parts.push(`Q 0 ${h} 0 ${h - cr}`);

  // Left edge
  if (hasLeftSlot) {
    // Up to slot end
    parts.push(`L 0 ${midY + r}`);
    // Slot: semicircle inward (to the right, inside the piece)
    parts.push(`A ${r} ${r} 0 1 1 0 ${midY - r}`);
    // Up to top
    parts.push(`L 0 ${cr}`);
  } else {
    parts.push(`L 0 ${cr}`);
  }

  // Top-left corner
  parts.push(`Q 0 0 ${cr} 0`);
  parts.push("Z");

  return parts.join(" ");
}

export function PuzzlePiece({
  text,
  category,
  position,
  isDragging = false,
  isInBar = false,
  onRemove,
}: PuzzlePieceProps) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(MIN_WIDTH);
  const colors = CATEGORY_COLORS[category];

  // Measure text width
  useEffect(() => {
    if (measureRef.current) {
      const w = measureRef.current.offsetWidth;
      setMeasuredWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w + PADDING_X * 2 + 12)));
    }
  }, [text]);

  const svgWidth = measuredWidth + (position === "first" || position === "middle" ? TAB_RADIUS : 0);
  const path = buildPath(measuredWidth, PIECE_HEIGHT, position);

  return (
    <div
      className={`relative inline-flex items-center shrink-0 select-none transition-all ${
        isDragging ? "opacity-60 scale-105" : ""
      } ${isInBar && position !== "first" && position !== "only" ? "-ml-[10px]" : ""}`}
      style={{ zIndex: isDragging ? 50 : "auto" }}
      role="listitem"
      aria-label={`${CATEGORY_LABELS[category]}: ${text}`}
      tabIndex={0}
    >
      {/* Hidden text measurer */}
      <span
        ref={measureRef}
        className="absolute invisible whitespace-nowrap text-xs font-medium"
        aria-hidden="true"
      >
        {text}
      </span>

      <svg
        width={svgWidth}
        height={PIECE_HEIGHT}
        viewBox={`0 0 ${svgWidth} ${PIECE_HEIGHT}`}
        className="block"
      >
        {/* Shadow */}
        <path
          d={path}
          fill="rgba(0,0,0,0.08)"
          transform="translate(1, 2)"
        />
        {/* Main shape */}
        <path
          d={path}
          fill={colors.fill}
          stroke={isDragging ? "#ffffff" : "rgba(255,255,255,0.2)"}
          strokeWidth={isDragging ? 2 : 1}
          className="transition-all"
        />
        {/* Text */}
        <foreignObject
          x={position === "middle" || position === "last" ? TAB_RADIUS : 6}
          y={0}
          width={measuredWidth - (position === "middle" || position === "last" ? TAB_RADIUS + 6 : 12)}
          height={PIECE_HEIGHT}
        >
          <div
            className="flex items-center justify-center h-full px-1"
            style={{ color: colors.text }}
          >
            <span className="text-xs font-medium leading-tight text-center truncate">
              {text}
            </span>
          </div>
        </foreignObject>
      </svg>

      {/* Remove button (bar pieces only) */}
      {isInBar && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] leading-none opacity-0 group-hover:opacity-100 hover:!opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-300 transition-opacity z-10"
          aria-label={`Remove ${text} from answer`}
        >
          ×
        </button>
      )}
    </div>
  );
}
