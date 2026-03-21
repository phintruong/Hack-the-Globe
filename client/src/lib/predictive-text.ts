// Common English words for predictive text.
// Users sign partial prefixes with available ASL letters (A,B,C,D,I,L,O,V,W,Y)
// and we suggest full words — even if the word contains letters outside the 10.

const COMMON_WORDS: string[] = [
  // High-frequency interview words
  "i", "a", "about", "ability", "able", "accomplish", "achieve", "action",
  "actually", "add", "adapt", "aid", "all", "allow", "also", "always",
  "apply", "bad", "badly", "bail", "balance", "bald", "ball", "based",
  "basically", "because", "become", "believe", "best", "better", "big",
  "bold", "both", "bring", "build", "business", "but", "by",
  "call", "called", "can", "challenge", "change", "child", "civil",
  "climb", "close", "cloud", "cold", "collaborate", "college", "come",
  "communicate", "company", "complete", "computer", "contribute", "could",
  "create", "current", "daily", "data", "day", "deadline", "deal",
  "decide", "deliver", "design", "develop", "development", "did", "difficult",
  "digital", "direct", "discuss", "do", "document", "does", "doing", "done",
  "down", "drive", "during",
  "idea", "identify", "important", "improve", "include", "individual",
  "information", "initiative", "input", "instead", "interview", "into",
  "involve", "issue",
  "job", "join", "just",
  "know", "knowledge",
  "lab", "language", "large", "last", "lead", "leadership", "learn",
  "like", "listen", "live", "long", "look", "lot", "love", "low",
  "visual", "value", "very", "voice", "volunteer",
  "wait", "walk", "want", "was", "way", "we", "well", "were", "what",
  "when", "where", "which", "while", "who", "why", "will", "with",
  "without", "word", "work", "worked", "working", "world", "would", "write",
  "year", "yes", "you", "your",
  // Common short words
  "am", "an", "and", "are", "as", "at", "be", "been", "before",
  "between", "can", "did", "each", "find", "first", "for", "from",
  "get", "give", "go", "good", "great", "had", "has", "have", "he",
  "help", "her", "here", "him", "his", "how", "if", "in", "is", "it",
  "its", "keep", "let", "life", "made", "make", "many", "me", "more",
  "most", "much", "must", "my", "need", "new", "no", "not", "now",
  "of", "off", "old", "on", "one", "only", "or", "other", "our",
  "out", "over", "own", "part", "people", "place", "plan", "point",
  "problem", "project", "put",
  "right", "run", "said", "same", "say", "see", "she", "should",
  "show", "so", "some", "still", "such", "take", "team", "tell",
  "than", "that", "the", "their", "them", "then", "there", "these",
  "they", "thing", "think", "this", "those", "through", "time", "to",
  "together", "too", "try", "turn", "two", "under", "up", "us", "use",
  // Sign/accessibility related
  "accessible", "accommodate", "american", "caption", "closed",
  "deaf", "disability", "diverse", "equal", "hearing", "inclusive",
  "interpret", "language", "opportunity", "sign", "support",
  "accommodate", "accessible", "barrier", "communication",
  // Feelings / interview
  "confident", "accomplished", "dedicated", "driven", "collaborative",
  "innovative", "creative", "analytical", "detail", "organized",
  "willing", "capable", "valuable", "ideal", "valid",
];

// Deduplicate and sort
const WORD_LIST = Array.from(new Set(COMMON_WORDS)).sort();

/**
 * Given the letters signed so far, return word suggestions.
 * Matches the signed prefix against the start of words.
 */
export function getSuggestions(signedLetters: string, maxResults = 5): string[] {
  const prefix = signedLetters.toLowerCase().trim();
  if (prefix.length === 0) return [];

  const exact: string[] = [];
  const startsWith: string[] = [];

  for (const word of WORD_LIST) {
    if (word === prefix) {
      exact.push(word);
    } else if (word.startsWith(prefix)) {
      startsWith.push(word);
    }
  }

  // Exact matches first, then prefix matches sorted by length (shorter = more likely)
  const results = [
    ...exact,
    ...startsWith.sort((a, b) => a.length - b.length),
  ];

  return results.slice(0, maxResults);
}

/**
 * Given partial letters, try to complete into the most likely word.
 * Returns null if no confident match.
 */
export function autoComplete(signedLetters: string): string | null {
  const suggestions = getSuggestions(signedLetters, 1);
  return suggestions.length > 0 ? suggestions[0] : null;
}
