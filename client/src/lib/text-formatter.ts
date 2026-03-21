import { DICTIONARY } from "./word-dictionary";

// Build a set for O(1) lookup
const dictSet = new Set(DICTIONARY.map((w) => w.toLowerCase()));

/**
 * Greedy longest-match segmentation of a letter string into words.
 * E.g., "DAILYCOLD" -> ["DAILY", "COLD"]
 */
export function segmentIntoWords(letters: string): string[] {
  const input = letters.toLowerCase();
  const words: string[] = [];
  let i = 0;

  while (i < input.length) {
    let bestLen = 0;

    // Try longest match first (up to 10 chars)
    for (let len = Math.min(10, input.length - i); len >= 1; len--) {
      const candidate = input.substring(i, i + len);
      if (dictSet.has(candidate)) {
        bestLen = len;
        break;
      }
    }

    if (bestLen > 0) {
      words.push(input.substring(i, i + bestLen));
      i += bestLen;
    } else {
      // No match — keep the letter as-is
      words.push(input[i]);
      i++;
    }
  }

  return words;
}

/**
 * Format segmented words: capitalize first letter, join with spaces, add period.
 */
export function formatText(words: string[]): string {
  if (words.length === 0) return "";

  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

/**
 * Full pipeline: raw letters → formatted text.
 * Confidence-gated: if average confidence < 60%, returns raw passthrough.
 */
export function processLetters(
  letters: string[],
  confidences: number[]
): { formatted: string; isRaw: boolean } {
  if (letters.length === 0) return { formatted: "", isRaw: false };

  const avgConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const raw = letters.join("");

  if (avgConfidence < 60) {
    return { formatted: raw, isRaw: true };
  }

  const words = segmentIntoWords(raw);
  return { formatted: formatText(words), isRaw: false };
}
