import type { KnowledgeGraph } from "./knowledge-graph.service.js";
import { knowledgeGraphToContext } from "./knowledge-graph.service.js";
import type { QuestionType } from "../types/index.js";

function overlap(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const bWords = b.toLowerCase().split(/\W+/).filter(Boolean);
  return bWords.filter((w) => aWords.has(w)).length;
}

function cap(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) : text;
}

/**
 * Returns a filtered knowledge graph context string tailored to the question type.
 * Avoids dumping the full KG into every prompt.
 */
export function getRelevantKGContext(
  kg: KnowledgeGraph,
  questionType: QuestionType,
  question: string
): string {
  const parts: string[] = [];

  if (questionType === "puzzle") {
    // Light context: summary + strengths only
    if (kg.summary) parts.push(`Summary: ${kg.summary}`);
    if (kg.strengths.length) parts.push(`Strengths: ${kg.strengths.join(", ")}`);
    return cap(parts.join("\n"), 500);
  }

  if (questionType === "intro") {
    if (kg.summary) parts.push(`Summary: ${kg.summary}`);
    if (kg.skills.length) parts.push(`Skills: ${kg.skills.join(", ")}`);
    if (kg.industries.length) parts.push(`Industries: ${kg.industries.join(", ")}`);
    if (kg.strengths.length) parts.push(`Strengths: ${kg.strengths.join(", ")}`);
    return cap(parts.join("\n"), 800);
  }

  if (questionType === "resume_based") {
    return cap(knowledgeGraphToContext(kg), 2500);
  }

  if (questionType === "follow_up") {
    // Top 2 experiences only
    const top = kg.experiences.slice(0, 2);
    for (const exp of top) {
      parts.push(`Experience: ${exp.role} at ${exp.company} (${exp.duration})`);
      for (const b of exp.bullets) {
        parts.push(`  • ${b.text}`);
      }
    }
    return cap(parts.join("\n"), 800);
  }

  if (questionType === "technical") {
    if (kg.skills.length) parts.push(`Skills: ${kg.skills.join(", ")}`);
    // Projects with keyword overlap
    const scoredProjects = kg.projects.map((p) => ({
      proj: p,
      score: overlap(question, p.name + " " + p.description + " " + p.technologies.join(" ")),
    }));
    scoredProjects.sort((a, b) => b.score - a.score);
    for (const { proj } of scoredProjects.slice(0, 3)) {
      parts.push(`Project: ${proj.name} — ${proj.description} [${proj.technologies.join(", ")}]`);
      for (const b of proj.bullets.slice(0, 2)) {
        parts.push(`  • ${b.text}`);
      }
    }
    return cap(parts.join("\n"), 1500);
  }

  // behavioral (default): experiences with keyword overlap + strengths
  if (kg.strengths.length) parts.push(`Strengths: ${kg.strengths.join(", ")}`);
  const scoredExps = kg.experiences.map((exp) => ({
    exp,
    score: overlap(
      question,
      exp.role + " " + exp.highlights.join(" ") + " " + exp.bullets.map((b) => b.keywords.join(" ")).join(" ")
    ),
  }));
  scoredExps.sort((a, b) => b.score - a.score);
  for (const { exp } of scoredExps.slice(0, 3)) {
    parts.push(`Experience: ${exp.role} at ${exp.company} (${exp.duration}) — ${exp.highlights.join("; ")}`);
    for (const b of exp.bullets.slice(0, 3)) {
      parts.push(`  • ${b.text} [${b.keywords.join(", ")}]`);
    }
  }
  return cap(parts.join("\n"), 1500);
}
