import { SUPPORT_FAQ, FAQEntry } from '../data/supportFAQ';

/**
 * Result returned by the pattern-matching engine.
 */
export interface AgentMatchResult {
  entry: FAQEntry;
  score: number;
}

/**
 * Tokenize input text into lowercase words, stripping punctuation and common stop words.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from',
  'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
  'don', 'should', 'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your',
  'please', 'help', 'want', 'need', 'tell', 'know', 'can', 'could', 'would'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Matches a user query string against the FAQ knowledge base.
 * Returns the best matching entry if its score exceeds the minimum threshold, or null if no confident match.
 */
export function matchUserQuery(query: string, minScore = 2): AgentMatchResult | null {
  if (!query || !query.trim()) return null;

  const queryLower = query.toLowerCase().trim();

  // 1. Direct exact/near-exact question match first
  for (const entry of SUPPORT_FAQ) {
    if (entry.question.toLowerCase() === queryLower || queryLower.includes(entry.question.toLowerCase())) {
      return { entry, score: 100 };
    }
  }

  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  let bestEntry: FAQEntry | null = null;
  let maxScore = 0;

  for (const entry of SUPPORT_FAQ) {
    let score = 0;
    const entryTokens = new Set([
      ...tokenize(entry.question),
      ...entry.keywords.map(k => k.toLowerCase())
    ]);

    // Calculate score based on token overlap
    for (const token of tokens) {
      if (entryTokens.has(token)) {
        score += 2; // Keyword match
      } else {
        // Partial substring match
        for (const kw of entry.keywords) {
          if (kw.toLowerCase().includes(token) || token.includes(kw.toLowerCase())) {
            score += 1;
            break;
          }
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry && maxScore >= minScore) {
    return { entry: bestEntry, score: maxScore };
  }

  return null;
}
