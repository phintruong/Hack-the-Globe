import { Router } from "express";
import { getSupabase } from "../lib/supabase.js";
import type { DbModule, DbQuestion } from "../types/index.js";

const router = Router();

/** Entitlement bypassed — all modules unlocked */

/** GET /api/modules?locale=en&userId=... */
router.get("/api/modules", async (req, res) => {
  try {
    const locale = (req.query.locale as string) || "en";
    const userId = req.query.userId as string | undefined;

    const { data: modules, error: modErr } = await getSupabase()
      .from("modules")
      .select("*")
      .order("sort_order");

    if (modErr || !modules) {
      res.status(500).json({ error: "Failed to fetch modules" });
      return;
    }

    const { data: questions, error: qErr } = await getSupabase()
      .from("module_questions")
      .select("*")
      .order("sort_order");

    if (qErr) {
      res.status(500).json({ error: "Failed to fetch questions" });
      return;
    }

    // Fetch translations if non-English locale
    let translations: Record<string, string> = {};
    if (locale !== "en") {
      const { data: trans } = await getSupabase()
        .from("module_translations")
        .select("module_id, question_id, field, translated_text")
        .eq("locale", locale);

      if (trans) {
        for (const t of trans) {
          const key = t.question_id
            ? `q:${t.question_id}:${t.field}`
            : `m:${t.module_id}:${t.field}`;
          translations[key] = t.translated_text;
        }
      }
    }

    const questionsByModule: Record<string, DbQuestion[]> = {};
    for (const q of questions ?? []) {
      if (!questionsByModule[q.module_id]) questionsByModule[q.module_id] = [];
      questionsByModule[q.module_id].push(q);
    }

    const result = (modules as DbModule[]).map((mod) => {
        const qs = (questionsByModule[mod.id] ?? []).map((q) => ({
          id: q.id,
          module_id: q.module_id,
          prompt: translations[`q:${q.id}:prompt`] ?? q.prompt,
          tip: translations[`q:${q.id}:tip`] ?? q.tip,
          question_type: q.question_type,
          sort_order: q.sort_order,
        }));

        return {
          id: mod.id,
          title: translations[`m:${mod.id}:title`] ?? mod.title,
          description: translations[`m:${mod.id}:description`] ?? mod.description,
          sort_order: mod.sort_order,
          is_premium: mod.is_premium,
          locked: false,
          questions: qs,
        };
      });

    res.json(result);
  } catch (err) {
    console.error("GET /api/modules error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/modules/:moduleId?locale=en&userId=... */
router.get("/api/modules/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;
    const locale = (req.query.locale as string) || "en";
    const userId = req.query.userId as string | undefined;

    const { data: mod, error } = await getSupabase()
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (error || !mod) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const { data: questions } = await getSupabase()
      .from("module_questions")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order");

    let translations: Record<string, string> = {};
    if (locale !== "en") {
      const { data: trans } = await getSupabase()
        .from("module_translations")
        .select("question_id, field, translated_text")
        .eq("module_id", moduleId)
        .eq("locale", locale);

      if (trans) {
        for (const t of trans) {
          const key = `q:${t.question_id}:${t.field}`;
          translations[key] = t.translated_text;
        }
      }
    }

    res.json({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      sort_order: mod.sort_order,
      is_premium: mod.is_premium,
      locked: false,
      questions: (questions ?? []).map((q: DbQuestion) => ({
        id: q.id,
        module_id: q.module_id,
        prompt: translations[`q:${q.id}:prompt`] ?? q.prompt,
        tip: translations[`q:${q.id}:tip`] ?? q.tip,
        question_type: q.question_type,
        sort_order: q.sort_order,
      })),
    });
  } catch (err) {
    console.error("GET /api/modules/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/progress/:userId */
router.get("/api/progress/:userId", async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("user_module_progress")
      .select("question_id, best_score, attempts, completed_at")
      .eq("user_id", req.params.userId);

    if (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
      return;
    }

    res.json(data ?? []);
  } catch (err) {
    console.error("GET /api/progress/:userId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/progress — upsert { userId, questionId, score } */
router.post("/api/progress", async (req, res) => {
  try {
    const { userId, questionId, score } = req.body as {
      userId: string;
      questionId: string;
      score: number;
    };

    if (!userId || !questionId) {
      res.status(400).json({ error: "userId and questionId are required" });
      return;
    }

    // Fetch existing to compute best_score
    const { data: existing } = await getSupabase()
      .from("user_module_progress")
      .select("best_score, attempts")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .single();

    const bestScore = existing ? Math.max(existing.best_score, score) : score;
    const attempts = existing ? existing.attempts + 1 : 1;

    const { error } = await getSupabase()
      .from("user_module_progress")
      .upsert(
        {
          user_id: userId,
          question_id: questionId,
          best_score: bestScore,
          attempts,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,question_id" }
      );

    if (error) {
      res.status(500).json({ error: "Failed to save progress" });
      return;
    }

    res.json({ success: true, bestScore, attempts });
  } catch (err) {
    console.error("POST /api/progress error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/entitlement/:userId */
router.get("/api/entitlement/:userId", async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("user_entitlements")
      .select("tier, expires_at")
      .eq("user_id", req.params.userId)
      .single();

    if (error || !data) {
      // Default to free if no row exists
      res.json({ tier: "free", expires_at: null });
      return;
    }

    res.json({ tier: data.tier, expires_at: data.expires_at ?? null });
  } catch (err) {
    console.error("GET /api/entitlement/:userId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
