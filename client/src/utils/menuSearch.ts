import type { MenuItem } from "../types/index.js";

/**
 * Fast iterative Levenshtein distance for typo tolerance on short strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Checks whether a single search token matches a target word (substring or typo edit)
 */
function matchTokenToWord(token: string, word: string): { matches: boolean; exact: boolean } {
  if (word === token) return { matches: true, exact: true };
  if (word.startsWith(token)) return { matches: true, exact: true };
  if (word.includes(token)) return { matches: true, exact: false };

  // For words >= 4 chars, allow 1 typo; for >= 6 chars, allow up to 2 typos
  const maxLen = Math.max(token.length, word.length);
  if (maxLen >= 4) {
    const allowedDist = maxLen >= 6 ? 2 : 1;
    if (levenshteinDistance(token, word) <= allowedDist) {
      return { matches: true, exact: false };
    }
  }

  return { matches: false, exact: false };
}

/**
 * High-performance smart fuzzy search for Menu Items
 * Supports:
 * - Direct item code matches (e.g. "1", "36", "#14")
 * - Reversed multi-word search (e.g. "dosa masala" matches "Masala Dosa")
 * - Typo tolerance (e.g. "dosha", "mysor", "paner", "chole bhatur", "coffe")
 * - Category matching (e.g. "beverage", "south indian")
 * - Relevance sorting (exact matches prioritized at top)
 */
export function searchMenuItems(
  items: MenuItem[],
  rawQuery: string,
  categoryId?: string | null
): MenuItem[] {
  // Category filter
  const categoryFiltered = categoryId
    ? items.filter((item) => item.categoryId === categoryId)
    : items;

  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) {
    return categoryFiltered;
  }

  const cleanQuery = trimmed.replace(/^#/, "");
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const scored: { item: MenuItem; score: number }[] = [];

  for (const item of categoryFiltered) {
    const itemName = item.name.toLowerCase();
    const itemCode = (item.code || "").toLowerCase();
    const catName = (item.category?.name || "").toLowerCase();
    const itemWords = itemName.split(/\s+/).filter(Boolean);

    let score = 0;

    // 1. Exact item code match (Highest Priority)
    if (itemCode && (itemCode === cleanQuery || itemCode === trimmed)) {
      score += 1000;
    } else if (itemCode && itemCode.startsWith(cleanQuery)) {
      score += 500;
    }

    // 2. Exact item full name match or start-with
    if (itemName === cleanQuery) {
      score += 400;
    } else if (itemName.startsWith(cleanQuery)) {
      score += 250;
    } else if (itemName.includes(cleanQuery)) {
      score += 150;
    }

    // 3. Multi-token evaluation (all query tokens must match something in the item)
    let allTokensMatched = true;
    let exactTokenCount = 0;

    for (const token of queryTokens) {
      // Check code
      if (itemCode === token) {
        exactTokenCount++;
        continue;
      }
      if (itemCode.startsWith(token)) {
        continue;
      }

      // Check category name
      if (catName.includes(token)) {
        continue;
      }

      // Check individual words in item name
      let tokenMatchedWord = false;
      for (const word of itemWords) {
        const { matches, exact } = matchTokenToWord(token, word);
        if (matches) {
          tokenMatchedWord = true;
          if (exact) exactTokenCount++;
          break;
        }
      }

      if (!tokenMatchedWord) {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched) {
      score += 100 + (exactTokenCount * 25);
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort by score descending (most relevant first)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}
