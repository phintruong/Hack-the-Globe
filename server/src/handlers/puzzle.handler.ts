import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { getOpenAI } from "../services/openai.service.js";
import { getProfile } from "../services/profile.service.js";
import {
  knowledgeGraphToContext,
  KnowledgeGraph,
} from "../services/knowledge-graph.service.js";
import { getRelevantKGContext } from "../services/kg-retrieval.service.js";
import type {
  QuestionType,
  PuzzleBlock,
  ExperienceOption,
  StitchSegment,
  BlockCategory,
  PuzzleError,
} from "../types/index.js";

// ── Stitch cache ──
const stitchCache = new Map<
  string,
  { segments: StitchSegment[]; fullText: string; ts: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of stitchCache) {
    if (now - val.ts > CACHE_TTL) stitchCache.delete(key);
  }
}

// ── Generic fallback blocks when no KG available ──
const GENERIC_BLOCKS: PuzzleBlock[] = [
  { id: "g1", text: "led a team", category: "action" },
  { id: "g2", text: "solved a problem", category: "action" },
  { id: "g3", text: "improved performance", category: "action" },
  { id: "g4", text: "collaborated with", category: "action" },
  { id: "g5", text: "designed and built", category: "action" },
  { id: "g6", text: "in my previous role", category: "context" },
  { id: "g7", text: "during the project", category: "context" },
  { id: "g8", text: "for the team", category: "context" },
  { id: "g9", text: "significant results", category: "metric" },
  { id: "g10", text: "within deadline", category: "metric" },
  { id: "g11", text: "communication skills", category: "skill" },
  { id: "g12", text: "problem solving", category: "skill" },
];

const GENERIC_OPTIONS: ExperienceOption[] = [
  { label: "A", title: "Direct answer", description: "Address the question head-on with your most relevant experience" },
  { label: "B", title: "Detailed explanation", description: "Give a thorough walkthrough of a specific situation" },
  { label: "C", title: "Ask for clarification", description: "Request more context before answering" },
  { label: "D", title: "Redirect to strength", description: "Pivot to showcase your strongest relevant skill" },
];

// ── Prompt templates by question type ──
function getAnglePrompt(questionType: QuestionType): string {
  switch (questionType) {
    case "technical":
      return "A=most relevant project/technical experience, B=system design or architecture angle, C=debugging or problem-solving approach, D=optimization or performance angle";
    case "intro":
    case "resume_based":
      return "A=career narrative emphasizing growth, B=skills-focused highlighting technical depth, C=passion and motivation angle, D=impact-focused with measurable outcomes";
    default: // behavioral, puzzle, follow_up
      return "A=most relevant direct experience, B=leadership or initiative angle, C=teamwork and collaboration angle, D=growth or learning moment";
  }
}

// ── Helpers ──
function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

function truncateWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/);
  return words.length > max ? words.slice(0, max).join(" ") : text.trim();
}

const VALID_CATEGORIES: BlockCategory[] = ["skill", "action", "metric", "context", "experience"];

function validateCategory(c: any): BlockCategory {
  return VALID_CATEGORIES.includes(c) ? c : "action";
}

// ── Extract KG keywords as fallback blocks ──
function extractKGBlocks(kg: KnowledgeGraph): PuzzleBlock[] {
  const blocks: PuzzleBlock[] = [];
  let id = 0;

  for (const skill of kg.skills.slice(0, 5)) {
    blocks.push({ id: `kb${id++}`, text: truncateWords(skill, 5), category: "skill" });
  }
  for (const exp of kg.experiences.slice(0, 3)) {
    blocks.push({ id: `kb${id++}`, text: truncateWords(`at ${exp.company}`, 5), category: "context" });
    for (const h of exp.highlights.slice(0, 2)) {
      blocks.push({ id: `kb${id++}`, text: truncateWords(h, 5), category: "action" });
    }
  }
  for (const proj of kg.projects.slice(0, 2)) {
    for (const tech of proj.technologies.slice(0, 2)) {
      blocks.push({ id: `kb${id++}`, text: truncateWords(tech, 5), category: "skill" });
    }
  }
  for (const s of kg.strengths.slice(0, 3)) {
    blocks.push({ id: `kb${id++}`, text: truncateWords(s, 5), category: "experience" });
  }

  // Pad with generics if too few
  if (blocks.length < 8) {
    for (const gb of GENERIC_BLOCKS.slice(0, 8 - blocks.length)) {
      blocks.push({ ...gb, id: `kb${id++}` });
    }
  }

  return blocks.slice(0, 20);
}

// ── Main handler ──
export function registerPuzzleHandlers(io: Server, socket: Socket) {
  // Socket-stored userId (set on first authenticated event)
  let socketUserId: string | null = null;

  // Rate limiting for stitch
  let lastStitchTime = 0;
  let lastStitchKey = "";

  function attachUserId(clientUserId?: string): string | null {
    if (socketUserId) return socketUserId;
    if (clientUserId) {
      socketUserId = clientUserId;
      return socketUserId;
    }
    return null;
  }

  function emitError(event: PuzzleError["event"], message: string, fallbackUsed: boolean) {
    socket.emit("puzzle:error", { event, message, fallbackUsed } as PuzzleError);
  }

  // ── Event 1: Generate experience options ──
  socket.on(
    "puzzle:generate-options",
    async (data: { userId?: string; question: string; questionType?: QuestionType }) => {
      const userId = attachUserId(data.userId);
      if (!userId) {
        emitError("generate-options", "Session not initialized. Please reload.", false);
        return;
      }

      try {
        const profile = await getProfile(userId);
        const kg = profile?.knowledgeGraph as KnowledgeGraph | null;

        if (!kg || !kg.experiences?.length) {
          // No KG — emit generic options + hint
          socket.emit("puzzle:options", { success: true, options: GENERIC_OPTIONS, noKG: true });
          return;
        }

        const kgContext = knowledgeGraphToContext(kg);
        const angleGuide = getAnglePrompt(data.questionType ?? "behavioral");

        const response = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an interview coach helping a deaf candidate prepare answers.
Given the interview question and the candidate's background, generate exactly 4 distinct answer angles (A, B, C, D).
Each angle should draw from different parts of the candidate's experience.
${angleGuide}

Candidate background:
${kgContext.slice(0, 3000)}

Return ONLY valid JSON: [{"label":"A","title":"short title","description":"1-2 sentence description"},{"label":"B",...},{"label":"C",...},{"label":"D",...}]`,
            },
            { role: "user", content: data.question },
          ],
          temperature: 0.5,
          max_tokens: 500,
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0].message.content || "{}";
        let parsed = parseJSON(raw);

        // Handle both {options: [...]} and [...] formats
        const options: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.options)
          ? parsed.options
          : [];

        // Validate
        if (options.length < 4) throw new Error("LLM returned fewer than 4 options");

        const validated: ExperienceOption[] = options.slice(0, 4).map((o: any, i: number) => ({
          label: (["A", "B", "C", "D"] as const)[i],
          title: String(o.title || o.label || `Option ${i + 1}`).slice(0, 100),
          description: String(o.description || "").slice(0, 300),
        }));

        socket.emit("puzzle:options", { success: true, options: validated });
      } catch (err) {
        console.error("puzzle:generate-options error:", err);
        socket.emit("puzzle:options", { success: true, options: GENERIC_OPTIONS });
        emitError("generate-options", "Could not generate personalized options. Using defaults.", true);
      }
    }
  );

  // ── Event 2: Generate blocks for selected option ──
  socket.on(
    "puzzle:generate-blocks",
    async (data: {
      userId?: string;
      question: string;
      selectedOption: ExperienceOption;
      questionType?: QuestionType;
    }) => {
      const userId = attachUserId(data.userId);
      if (!userId) {
        emitError("generate-blocks", "Session not initialized. Please reload.", false);
        return;
      }

      try {
        const profile = await getProfile(userId);
        const kg = profile?.knowledgeGraph as KnowledgeGraph | null;

        if (!kg || !kg.experiences?.length) {
          // No KG — use generic blocks
          const blocks = GENERIC_BLOCKS.map((b) => ({ ...b, id: nanoid(8) }));
          socket.emit("puzzle:blocks", { success: true, blocks, noKG: true });
          return;
        }

        const questionType = data.questionType ?? "behavioral";
        const kgContext = getRelevantKGContext(kg, questionType, data.question);

        const response = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are helping a deaf candidate construct an interview answer using building blocks.
Given the question, the candidate's chosen answer angle, and their background, generate 12-15 short blocks.

Block categories:
- "skill": technical skills or tools (e.g., "Python", "React", "data analysis")
- "action": action phrases (e.g., "led team of 5", "designed the architecture", "reduced costs")
- "metric": quantifiable results (e.g., "by 30%", "in 2 weeks", "saving $50K")
- "context": situational context (e.g., "at Acme Corp", "during Q4 launch", "for the client")
- "experience": experience references (e.g., "as Senior Engineer", "in my internship")

Rules:
- Each block MUST be 1-5 words
- Generate 12-15 blocks total, mix of all categories
- Draw from the candidate's actual background when possible
- Blocks should be mix-and-matchable (user arranges them freely)
- Include more blocks than needed so user has choices

Candidate background:
${kgContext}

Answer angle chosen: ${data.selectedOption.title} — ${data.selectedOption.description}

Return ONLY valid JSON: [{"text":"...","category":"skill|action|metric|context|experience"},...]`,
            },
            { role: "user", content: data.question },
          ],
          temperature: 0.5,
          max_tokens: 600,
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0].message.content || "{}";
        let parsed = parseJSON(raw);

        // Handle {blocks: [...]} or [...]
        const blockArr: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.blocks)
          ? parsed.blocks
          : [];

        if (blockArr.length < 3) throw new Error("LLM returned too few blocks");

        // Validate, assign IDs server-side, truncate
        const blocks: PuzzleBlock[] = blockArr.slice(0, 20).map((b: any) => ({
          id: nanoid(8),
          text: truncateWords(String(b.text || ""), 8),
          category: validateCategory(b.category),
        })).filter((b) => b.text.length > 0);

        socket.emit("puzzle:blocks", { success: true, blocks });
      } catch (err) {
        console.error("puzzle:generate-blocks error:", err);
        // Fallback: extract from KG directly
        const profile = await getProfile(userId).catch(() => null);
        const kg = profile?.knowledgeGraph as KnowledgeGraph | null;
        const blocks = kg ? extractKGBlocks(kg) : GENERIC_BLOCKS.map((b) => ({ ...b, id: nanoid(8) }));
        socket.emit("puzzle:blocks", { success: true, blocks });
        emitError("generate-blocks", "Could not generate AI blocks. Using extracted keywords.", true);
      }
    }
  );

  // ── Event 3: Stitch blocks with filler words ──
  socket.on(
    "puzzle:stitch",
    async (data: { blocks: { id: string; text: string }[]; seq: number }) => {
      const seq = data.seq ?? 0;

      // Rate limit: ignore if < 300ms since last request
      const now = Date.now();
      if (now - lastStitchTime < 300) return;

      // Build cache key from ordered IDs
      const cacheKey = data.blocks.map((b) => b.id).join("|");

      // Ignore if identical to last request
      if (cacheKey === lastStitchKey && stitchCache.has(cacheKey)) {
        const cached = stitchCache.get(cacheKey)!;
        socket.emit("puzzle:stitched", { success: true, ...cached, seq });
        return;
      }

      lastStitchTime = now;
      lastStitchKey = cacheKey;

      // ≤1 block: return as-is
      if (!data.blocks.length) {
        socket.emit("puzzle:stitched", { success: true, segments: [], fullText: "", seq });
        return;
      }
      if (data.blocks.length === 1) {
        const seg: StitchSegment = { type: "block", text: data.blocks[0].text, blockId: data.blocks[0].id };
        socket.emit("puzzle:stitched", {
          success: true,
          segments: [seg],
          fullText: data.blocks[0].text,
          seq,
        });
        return;
      }

      // Check cache
      cleanCache();
      if (stitchCache.has(cacheKey)) {
        const cached = stitchCache.get(cacheKey)!;
        socket.emit("puzzle:stitched", { success: true, ...cached, seq });
        return;
      }

      try {
        const blockTexts = data.blocks.map((b) => b.text);

        const response = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You stitch interview answer fragments into a natural sentence.
Given ordered blocks, add ONLY the minimum filler words (articles, prepositions, conjunctions, verb forms) to make a grammatically correct, natural-sounding interview answer.

Rules:
- Preserve the EXACT text of each block — do not modify, reorder, or merge blocks
- Only add filler words BETWEEN blocks (and optionally at the start)
- Keep filler words minimal — just enough for grammar
- The result should sound professional and natural
- Return a JSON object with "segments" array

Return ONLY valid JSON:
{"segments":[{"type":"block","text":"exact block text","blockId":"id"},{"type":"filler","text":"connecting word"},...],"fullText":"the complete sentence"}`,
            },
            {
              role: "user",
              content: JSON.stringify(
                data.blocks.map((b) => ({ id: b.id, text: b.text }))
              ),
            },
          ],
          temperature: 0.2,
          max_tokens: 400,
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0].message.content || "{}";
        const parsed = parseJSON(raw);

        // Validate segments
        const segments: StitchSegment[] = (parsed.segments || [])
          .filter((s: any) => s && typeof s.text === "string" && s.text.trim())
          .map((s: any) => ({
            type: s.type === "filler" ? "filler" : "block",
            text: s.text.trim(),
            ...(s.type !== "filler" && s.blockId ? { blockId: s.blockId } : {}),
          }));

        const fullText =
          parsed.fullText || segments.map((s) => s.text).join(" ");

        const result = { segments, fullText };
        stitchCache.set(cacheKey, { ...result, ts: Date.now() });
        socket.emit("puzzle:stitched", { success: true, ...result, seq });
      } catch (err) {
        console.error("puzzle:stitch error:", err);
        // Fallback: join with spaces
        const segments: StitchSegment[] = data.blocks.map((b) => ({
          type: "block" as const,
          text: b.text,
          blockId: b.id,
        }));
        const fullText = data.blocks.map((b) => b.text).join(" ");
        socket.emit("puzzle:stitched", { success: true, segments, fullText, seq });
        emitError("stitch", "AI stitching unavailable. Showing raw blocks.", true);
      }
    }
  );

  // ── Analytics (lightweight, just log for now) ──
  socket.on("puzzle:analytics", (data: any) => {
    console.log(`[puzzle:analytics] ${socket.id}:`, data);
  });
}
