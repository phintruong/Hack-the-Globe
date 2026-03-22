import { Router } from "express";
import {
  buildKnowledgeGraph,
  knowledgeGraphToContext,
  KnowledgeGraph,
} from "../services/knowledge-graph.service.js";

const router = Router();

// In-memory store keyed by user ID (sufficient for hackathon demo)
const profiles = new Map<
  string,
  {
    resumeText: string;
    background: string;
    knowledgeGraph: KnowledgeGraph | null;
  }
>();

/** Save profile + build knowledge graph */
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

    profiles.set(userId, { resumeText, background, knowledgeGraph: kg });

    res.json({ success: true, knowledgeGraph: kg });
  } catch (error) {
    console.error("Profile save error:", error);
    res.status(500).json({ error: "Failed to build knowledge graph" });
  }
});

/** Get profile */
router.get("/api/profile/:userId", (req, res) => {
  const profile = profiles.get(req.params.userId);
  if (!profile) {
    res.json({ resumeText: "", background: "", knowledgeGraph: null });
    return;
  }
  res.json(profile);
});

/** Get knowledge graph context string (used by training handler) */
export function getKnowledgeGraphContext(userId: string): string | null {
  const profile = profiles.get(userId);
  if (!profile?.knowledgeGraph) return null;
  return knowledgeGraphToContext(profile.knowledgeGraph);
}

// Export a getter for the profiles map so training handler can access it
export function getProfile(userId: string) {
  return profiles.get(userId) ?? null;
}

export default router;
