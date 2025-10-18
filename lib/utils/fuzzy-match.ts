/**
 * Fuzzy matching utilities for wiki-links
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, higher is more similar)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
}

/**
 * Find the best fuzzy match for a given title
 * @param searchTitle The title to search for
 * @param candidates Array of objects with title and id
 * @param threshold Minimum similarity score (0-1)
 * @returns The best match or null if no good match found
 */
export function findBestFuzzyMatch<T extends { title: string | null; id: string }>(
  searchTitle: string,
  candidates: T[],
  threshold: number = 0.7
): T | null {
  if (!searchTitle || candidates.length === 0) return null;
  
  const normalizedSearch = searchTitle.toLowerCase().trim();
  
  let bestMatch: T | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    if (!candidate.title) continue;
    
    const normalizedCandidate = candidate.title.toLowerCase().trim();
    
    // First try exact match
    if (normalizedSearch === normalizedCandidate) {
      return candidate;
    }
    
    // Then try contains match (current behavior)
    if (normalizedCandidate.includes(normalizedSearch) || normalizedSearch.includes(normalizedCandidate)) {
      const score = calculateSimilarity(normalizedSearch, normalizedCandidate);
      if (score > bestScore && score >= threshold) {
        bestMatch = candidate;
        bestScore = score;
      }
    }
    
    // Finally try fuzzy match
    const fuzzyScore = calculateSimilarity(normalizedSearch, normalizedCandidate);
    if (fuzzyScore > bestScore && fuzzyScore >= threshold) {
      bestMatch = candidate;
      bestScore = fuzzyScore;
    }
  }
  
  return bestMatch;
}

/**
 * Check if two titles are similar enough to be considered the same
 * @param title1 First title
 * @param title2 Second title
 * @param threshold Minimum similarity score (0-1)
 * @returns True if titles are similar enough
 */
export function areTitlesSimilar(title1: string, title2: string, threshold: number = 0.8): boolean {
  if (!title1 || !title2) return false;
  
  const normalized1 = title1.toLowerCase().trim();
  const normalized2 = title2.toLowerCase().trim();
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  // Fuzzy match
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}
