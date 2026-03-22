"use client";

import { useState, useEffect } from "react";
import type { ApiModule } from "@/types/index";
import { MODULES } from "@/lib/questions";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export function useModules(locale = "en", userId?: string) {
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchModules() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ locale });
        if (userId) params.set("userId", userId);
        const res = await fetch(`${SERVER_URL}/api/modules?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiModule[] = await res.json();
        if (!cancelled) setModules(data);
      } catch (err) {
        console.warn("useModules: API failed, falling back to hardcoded modules", err);
        if (!cancelled) {
          // Fallback: map hardcoded MODULES to ApiModule shape
          setModules(
            MODULES.map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              sort_order: 0,
              is_premium: m.is_premium ?? false,
              locked: false,
              questions: m.questions.map((q, i) => ({
                id: q.id,
                module_id: m.id,
                prompt: q.prompt,
                tip: q.tip,
                question_type: q.question_type ?? "behavioral",
                sort_order: i,
              })),
            }))
          );
          setError("Using offline data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchModules();
    return () => { cancelled = true; };
  }, [locale, userId]);

  return { modules, loading, error };
}
