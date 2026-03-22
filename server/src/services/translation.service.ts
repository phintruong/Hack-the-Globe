import { getOpenAI } from "./openai.service.js";
import { getSupabase } from "../lib/supabase.js";

const SUPPORTED_LOCALES = ["en", "es", "fr", "zh"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  zh: "Chinese (Simplified)",
};

export async function translateText(text: string, targetLocale: string): Promise<string> {
  if (targetLocale === "en") return text;

  const langName = LOCALE_NAMES[targetLocale as SupportedLocale] ?? targetLocale;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${langName}. Return only the translated text, nothing else.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content?.trim() ?? text;
  } catch (err) {
    console.error("translateText error:", err);
    return text; // fallback: original text
  }
}

export async function translateBatch(
  texts: string[],
  targetLocale: string
): Promise<string[]> {
  if (targetLocale === "en") return texts;
  // Run in parallel, but limit concurrency to avoid rate limits
  const results: string[] = [];
  const BATCH = 5;
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH);
    const translated = await Promise.all(chunk.map((t) => translateText(t, targetLocale)));
    results.push(...translated);
  }
  return results;
}

/**
 * Pre-compute and cache translations for a module's static content.
 * Should be called when a module is created or when a new locale is needed.
 */
export async function cacheModuleTranslations(
  moduleId: string,
  locale: string
): Promise<void> {
  if (locale === "en") return;

  const supabase = getSupabase();

  // Fetch module
  const { data: mod } = await supabase
    .from("modules")
    .select("title, description")
    .eq("id", moduleId)
    .single();

  if (mod) {
    const [title, description] = await translateBatch(
      [mod.title, mod.description],
      locale
    );

    await supabase.from("module_translations").upsert(
      [
        { module_id: moduleId, question_id: "", locale, field: "title", translated_text: title },
        { module_id: moduleId, question_id: "", locale, field: "description", translated_text: description },
      ],
      { onConflict: "module_id,question_id,locale,field" }
    );
  }

  // Fetch questions
  const { data: questions } = await supabase
    .from("module_questions")
    .select("id, prompt, tip")
    .eq("module_id", moduleId);

  if (!questions?.length) return;

  const upserts: object[] = [];
  for (const q of questions) {
    const [prompt, tip] = await translateBatch(
      [q.prompt, q.tip ?? ""],
      locale
    );

    upserts.push({
      module_id: moduleId,
      question_id: q.id,
      locale,
      field: "prompt",
      translated_text: prompt,
    });

    if (q.tip) {
      upserts.push({
        module_id: moduleId,
        question_id: q.id,
        locale,
        field: "tip",
        translated_text: tip,
      });
    }
  }

  if (upserts.length) {
    await supabase
      .from("module_translations")
      .upsert(upserts, { onConflict: "module_id,question_id,locale,field" });
  }
}

/**
 * Read a cached translation, returning null if not found.
 */
export async function getTranslation(
  moduleId: string | null,
  questionId: string | null,
  locale: string,
  field: string
): Promise<string | null> {
  const query = getSupabase()
    .from("module_translations")
    .select("translated_text")
    .eq("locale", locale)
    .eq("field", field);

  if (moduleId) query.eq("module_id", moduleId);
  if (questionId) query.eq("question_id", questionId);

  const { data } = await query.single();
  return data?.translated_text ?? null;
}
