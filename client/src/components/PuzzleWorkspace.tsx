"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PuzzlePiece } from "./PuzzlePiece";
import type { PuzzleBlock, StitchSegment, BlockCategory } from "@/types";

// ── Draggable bank piece ──
function DraggableBankPiece({ block }: { block: PuzzleBlock }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: `bank-${block.id}`,
    data: { type: "bank", block },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#0077b6] rounded-lg"
    >
      <PuzzlePiece
        text={block.text}
        category={block.category}
        position="only"
        isDragging={isDragging}
      />
    </div>
  );
}

// ── Sortable bar piece ──
function SortableBarPiece({
  block,
  position,
  onRemove,
}: {
  block: PuzzleBlock;
  position: "first" | "middle" | "last" | "only";
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `bar-${block.id}`,
      data: { type: "bar", block },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#0077b6] rounded-lg"
      aria-roledescription="sortable"
    >
      <PuzzlePiece
        text={block.text}
        category={block.category}
        position={position}
        isDragging={isDragging}
        isInBar
        onRemove={onRemove}
      />
    </div>
  );
}

// ── Category section headers ──
const CATEGORY_ORDER: BlockCategory[] = ["action", "experience", "skill", "metric", "context"];
const CATEGORY_NAMES: Record<BlockCategory, string> = {
  action: "Actions",
  experience: "Experience",
  skill: "Skills",
  metric: "Metrics",
  context: "Context",
};

interface PuzzleWorkspaceProps {
  bankBlocks: PuzzleBlock[];
  barBlocks: PuzzleBlock[];
  stitchedSegments: StitchSegment[];
  isStitching: boolean;
  onMoveToBar: (blockId: string, index?: number) => void;
  onMoveToBank: (blockId: string) => void;
  onReorderBar: (fromIndex: number, toIndex: number) => void;
}

export function PuzzleWorkspace({
  bankBlocks,
  barBlocks,
  stitchedSegments,
  isStitching,
  onMoveToBar,
  onMoveToBank,
  onReorderBar,
}: PuzzleWorkspaceProps) {
  const [activePiece, setActivePiece] = useState<PuzzleBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group bank blocks by category
  const groupedBank = CATEGORY_ORDER.reduce<Record<BlockCategory, PuzzleBlock[]>>(
    (acc, cat) => {
      acc[cat] = bankBlocks.filter((b) => b.category === cat);
      return acc;
    },
    {} as Record<BlockCategory, PuzzleBlock[]>
  );

  const barPiecePosition = (index: number, total: number) => {
    if (total === 1) return "only" as const;
    if (index === 0) return "first" as const;
    if (index === total - 1) return "last" as const;
    return "middle" as const;
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const block = event.active.data.current?.block as PuzzleBlock | undefined;
    if (block) setActivePiece(block);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePiece(null);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      const activeId = String(active.id);
      const overId = String(over.id);

      // Bank → Bar (drop on bar area or a bar item)
      if (activeData?.type === "bank") {
        const blockId = activeData.block.id;
        if (overId === "bar-drop-zone" || overData?.type === "bar") {
          const targetIndex = overData?.type === "bar"
            ? barBlocks.findIndex((b) => `bar-${b.id}` === overId)
            : undefined;
          onMoveToBar(blockId, targetIndex !== undefined && targetIndex >= 0 ? targetIndex : undefined);
        }
        return;
      }

      // Bar → Bar reorder
      if (activeData?.type === "bar" && overData?.type === "bar") {
        const fromIdx = barBlocks.findIndex((b) => `bar-${b.id}` === activeId);
        const toIdx = barBlocks.findIndex((b) => `bar-${b.id}` === overId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          onReorderBar(fromIdx, toIdx);
        }
        return;
      }

      // Bar → Bank (drop outside bar or on bank area)
      if (activeData?.type === "bar" && (!overData?.type || overData?.type === "bank")) {
        onMoveToBank(activeData.block.id);
      }
    },
    [barBlocks, onMoveToBar, onMoveToBank, onReorderBar]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* ── Block Bank ── */}
        <div className="bg-[#f8fbff] border border-[#caf0f8] rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-wider text-black/40 font-medium block mb-2">
            Available blocks — drag to your answer
          </span>
          <div className="space-y-2" role="list" aria-label="Available blocks">
            {CATEGORY_ORDER.map((cat) => {
              const blocks = groupedBank[cat];
              if (!blocks.length) return null;
              return (
                <div key={cat}>
                  <span className="text-[9px] uppercase tracking-wider text-black/30 font-medium">
                    {CATEGORY_NAMES[cat]}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {blocks.map((block) => (
                      <DraggableBankPiece key={block.id} block={block} />
                    ))}
                  </div>
                </div>
              );
            })}
            {bankBlocks.length === 0 && (
              <p className="text-xs text-black/30 text-center py-2">
                All blocks used! Remove blocks from your answer to reuse them.
              </p>
            )}
          </div>
        </div>

        {/* ── Sentence Bar ── */}
        <div
          className="bg-white border-2 border-dashed border-[#ade8f4] rounded-xl p-3 min-h-[60px] transition-colors"
          id="bar-drop-zone"
        >
          <span className="text-[10px] uppercase tracking-wider text-black/40 font-medium block mb-2">
            Your answer
          </span>
          {barBlocks.length > 0 ? (
            <SortableContext
              items={barBlocks.map((b) => `bar-${b.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                className="flex flex-wrap items-center gap-y-2"
                role="list"
                aria-label="Your answer"
              >
                {barBlocks.map((block, i) => (
                  <SortableBarPiece
                    key={block.id}
                    block={block}
                    position={barPiecePosition(i, barBlocks.length)}
                    onRemove={() => onMoveToBank(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div className="flex items-center justify-center py-3">
              <p className="text-sm text-black/30">
                Drag blocks here to build your answer
              </p>
            </div>
          )}
        </div>

        {/* ── Stitch Preview ── */}
        {(stitchedSegments.length > 0 || isStitching) && (
          <div
            className={`bg-[#faf5ff] border border-purple-100 rounded-xl p-3 transition-opacity ${
              isStitching ? "animate-pulse" : ""
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-purple-400 font-medium block mb-1">
              {isStitching ? "Stitching..." : "Preview"}
            </span>
            <p className="text-sm leading-relaxed">
              {stitchedSegments.map((seg, i) => (
                <span
                  key={i}
                  className={
                    seg.type === "filler"
                      ? "text-purple-600 italic"
                      : "text-black font-medium"
                  }
                >
                  {seg.text}{" "}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {/* ── Drag Overlay ── */}
      <DragOverlay>
        {activePiece ? (
          <PuzzlePiece
            text={activePiece.text}
            category={activePiece.category}
            position="only"
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
