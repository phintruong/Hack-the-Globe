import { getOpenAI } from "./openai.service.js";

export interface BulletPoint {
  text: string;
  keywords: string[];
}

export interface KnowledgeGraph {
  skills: string[];
  experiences: {
    role: string;
    company: string;
    duration: string;
    highlights: string[];
    bullets: BulletPoint[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    keywords: string[];
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    bullets: BulletPoint[];
  }[];
  strengths: string[];
  industries: string[];
  summary: string;
}

const EXTRACT_PROMPT = `You are a career analyst. Extract a deeply structured knowledge graph from the candidate's resume text and background info.

For each experience and project, extract every bullet point and pull out the key technical/business keywords from each bullet.

Return JSON in this exact format:
{
  "skills": ["skill1", "skill2"],
  "experiences": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "highlights": ["short highlight 1", "short highlight 2"],
      "bullets": [
        { "text": "Full bullet point text from resume", "keywords": ["keyword1", "keyword2"] }
      ]
    }
  ],
  "education": [
    { "degree": "Degree Name", "institution": "School", "year": "Year or range", "keywords": ["relevant coursework", "honors", "GPA if listed"] }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "One-line description",
      "technologies": ["tech1", "tech2"],
      "bullets": [
        { "text": "Full bullet point text", "keywords": ["keyword1", "keyword2"] }
      ]
    }
  ],
  "strengths": ["strength1", "strength2"],
  "industries": ["industry1"],
  "summary": "2-3 sentence professional summary"
}

Rules:
- Extract EVERY bullet point from the resume verbatim into the bullets array
- For each bullet, extract 2-5 keywords (technologies, metrics, methodologies, tools, business terms)
- highlights should be short 5-8 word summaries of the most impressive achievements
- If info is missing for a field, use an empty array or empty string`;

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

  // Normalize experiences — ensure bullets array exists
  const experiences = (data.experiences ?? []).map((e: any) => ({
    role: e.role ?? "",
    company: e.company ?? "",
    duration: e.duration ?? "",
    highlights: e.highlights ?? [],
    bullets: (e.bullets ?? []).map((b: any) => ({
      text: typeof b === "string" ? b : b.text ?? "",
      keywords: typeof b === "string" ? [] : b.keywords ?? [],
    })),
  }));

  const education = (data.education ?? []).map((e: any) => ({
    degree: e.degree ?? "",
    institution: e.institution ?? "",
    year: e.year ?? "",
    keywords: e.keywords ?? [],
  }));

  const projects = (data.projects ?? []).map((p: any) => ({
    name: p.name ?? "",
    description: p.description ?? "",
    technologies: p.technologies ?? [],
    bullets: (p.bullets ?? []).map((b: any) => ({
      text: typeof b === "string" ? b : b.text ?? "",
      keywords: typeof b === "string" ? [] : b.keywords ?? [],
    })),
  }));

  return {
    skills: data.skills ?? [],
    experiences,
    education,
    projects,
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
    parts.push(
      `Experience: ${exp.role} at ${exp.company} (${exp.duration}) — ${exp.highlights.join("; ")}`
    );
    for (const b of exp.bullets) {
      parts.push(`  • ${b.text} [${b.keywords.join(", ")}]`);
    }
  }

  for (const edu of kg.education) {
    parts.push(`Education: ${edu.degree} from ${edu.institution} (${edu.year})`);
  }

  for (const proj of kg.projects) {
    parts.push(
      `Project: ${proj.name} — ${proj.description} [${proj.technologies.join(", ")}]`
    );
    for (const b of proj.bullets) {
      parts.push(`  • ${b.text} [${b.keywords.join(", ")}]`);
    }
  }

  return parts.join("\n");
}
