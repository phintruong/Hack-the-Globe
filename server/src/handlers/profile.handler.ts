import { Router } from "express";
import { buildKnowledgeGraph } from "../services/knowledge-graph.service.js";
import { getSupabase } from "../lib/supabase.js";

// Re-export from service for backwards compat
export { getProfile, getKnowledgeGraphContext } from "../services/profile.service.js";

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

export default router;
