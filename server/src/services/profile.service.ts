import {
  knowledgeGraphToContext,
  KnowledgeGraph,
} from "./knowledge-graph.service.js";
import { getSupabase } from "../lib/supabase.js";

/** Get full profile from Supabase */
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

/** Get knowledge graph context string */
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
