import { Router } from "express";
import {
  buildKnowledgeGraph,
  knowledgeGraphToContext,
  KnowledgeGraph,
} from "../services/knowledge-graph.service.js";
import { getSupabase } from "../lib/supabase.js";

const router = Router();

/** Save profile + build knowledge graph → persist to Supabase */
router.post("/api/profile", async (req, res) => {
  try {
    const { userId, resumeText, background } = req.body as {
      userId: string;
      resumeText: string;
      background: string;
    };

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const kg = await buildKnowledgeGraph(resumeText || "", background || "");

    // Upsert into Supabase (insert or update on conflict)
    const { error } = await getSupabase().from("profiles").upsert(
      {
        user_id: userId,
        resume_text: resumeText || "",
        background: background || "",
        knowledge_graph: kg,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Supabase upsert error:", error.message, error.details, error.hint, error.code);
      res.status(500).json({ error: "Failed to save profile to database" });
      return;
    }

    res.json({ success: true, knowledgeGraph: kg });
  } catch (error) {
    console.error("Profile save error:", error);
    res.status(500).json({ error: "Failed to build knowledge graph" });
  }
});

/** Get profile from Supabase */
router.get("/api/profile/:userId", async (req, res) => {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("resume_text, background, knowledge_graph")
    .eq("user_id", req.params.userId)
    .single();

  if (error || !data) {
    res.json({ resumeText: "", background: "", knowledgeGraph: null });
    return;
  }

  res.json({
    resumeText: data.resume_text || "",
    background: data.background || "",
    knowledgeGraph: data.knowledge_graph || null,
  });
});

/** Get knowledge graph context string (used by training handler) */
export async function getKnowledgeGraphContext(
  userId: string
): Promise<string | null> {
  const { data } = await getSupabase()
    .from("profiles")
    .select("knowledge_graph")
    .eq("user_id", userId)
    .single();

  if (!data?.knowledge_graph) return null;
  return knowledgeGraphToContext(data.knowledge_graph as KnowledgeGraph);
}

/** Get full profile */
export async function getProfile(userId: string) {
  const { data } = await getSupabase()
    .from("profiles")
    .select("resume_text, background, knowledge_graph")
    .eq("user_id", userId)
    .single();

  if (!data) return null;
  return {
    resumeText: data.resume_text,
    background: data.background,
    knowledgeGraph: data.knowledge_graph,
  };
}

export default router;
