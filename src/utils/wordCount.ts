/**
 * Utility functions for word counting and validation
 */

/**
 * Count words in a text string
 * Words are separated by whitespace
 */
export function countWords(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Validate text against word limit
 * Returns true if within limit, false if over
 */
export function validateWordLimit(text: string, maxWords: number): boolean {
  return countWords(text) <= maxWords;
}

/**
 * Get word count display text
 * Shows current/max words
 */
export function getWordCountText(text: string, maxWords: number): string {
  const current = countWords(text);
  return `${current}/${maxWords} words`;
}

/**
 * Truncate text to word limit
 * Cuts off at the word boundary
 */
export function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}
