import type { Article, TrendingKeyword } from "./types";

// Common Korean particles/stopwords that pollute naive whitespace tokenization.
const STOPWORDS = new Set([
  "속보", "단독", "종합", "영상", "포토", "인터뷰", "기자", "오늘", "내일",
  "관련", "위해", "대한", "통해", "이번", "지난", "올해", "그리고", "에서",
  "으로", "에게", "부터", "까지", "합니다", "했다", "한다", "된다", "위한",
]);

/** Very lightweight keyword frequency counter over article titles. No morphological
 * analysis (no external NLP dep) — good enough to surface repeated proper nouns/topics
 * across many headlines in the same window. */
export function extractTrendingKeywords(articles: Article[], topN = 10): TrendingKeyword[] {
  const counts = new Map<string, number>();

  for (const article of articles) {
    const tokens = article.title
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

    const uniqueInTitle = new Set(tokens);
    for (const token of uniqueInTitle) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({ keyword, count }));
}
