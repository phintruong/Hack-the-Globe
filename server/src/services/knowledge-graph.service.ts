import { getOpenAI } from "./openai.service.js";

export interface KnowledgeGraph {
  skills: string[];
  experiences: { role: string; company: string; duration: string; highlights: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  projects: { name: string; description: string; technologies: string[] }[];
  strengths: string[];
  industries: string[];
  summary: string;
}

const EXTRACT_PROMPT = `You are a career analyst. Extract a structured knowledge graph from the candidate's resume text and background info.

Return JSON in this exact format:
{
  "skills": ["skill1", "skill2"],
  "experiences": [{ "role": "...", "company": "...", "duration": "...", "highlights": ["..."] }],
  "education": [{ "degree": "...", "institution": "...", "year": "..." }],
  "projects": [{ "name": "...", "description": "...", "technologies": ["..."] }],
  "strengths": ["strength1", "strength2"],
  "industries": ["industry1"],
  "summary": "2-3 sentence professional summary"
}

Extract as much as you can. If info is missing for a field, use an empty array or empty string.`;

export async function buildKnowledgeGraph(
  resumeText: string,
  background: string
): Promise<KnowledgeGraph> {
  const userContent = [
    resumeText ? `Resume:\n${resumeText}` : "",
    background ? `Background info:\n${background}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const data = JSON.parse(result.choices[0].message.content || "{}");

  return {
    skills: data.skills ?? [],
    experiences: data.experiences ?? [],
    education: data.education ?? [],
    projects: data.projects ?? [],
    strengths: data.strengths ?? [],
    industries: data.industries ?? [],
    summary: data.summary ?? "",
  };
}

export function knowledgeGraphToContext(kg: KnowledgeGraph): string {
  const parts: string[] = [];

  if (kg.summary) parts.push(`Summary: ${kg.summary}`);
  if (kg.skills.length) parts.push(`Skills: ${kg.skills.join(", ")}`);
  if (kg.industries.length) parts.push(`Industries: ${kg.industries.join(", ")}`);
  if (kg.strengths.length) parts.push(`Strengths: ${kg.strengths.join(", ")}`);

  for (const exp of kg.experiences) {
    parts.push(`Experience: ${exp.role} at ${exp.company} (${exp.duration}) — ${exp.highlights.join("; ")}`);
  }

  for (const edu of kg.education) {
    parts.push(`Education: ${edu.degree} from ${edu.institution} (${edu.year})`);
  }

  for (const proj of kg.projects) {
    parts.push(`Project: ${proj.name} — ${proj.description} [${proj.technologies.join(", ")}]`);
  }

  return parts.join("\n");
}
