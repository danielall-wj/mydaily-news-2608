export type CategoryKey =
  | "ai"
  | "it"
  | "business"
  | "politics"
  | "world"
  | "sports"
  | "entertainment";

export interface FeedSource {
  url: string;
  /** Explicit source label. Omit only for Google News feeds, whose titles already
   * encode the source as "Headline - Source" and get parsed at collection time. */
  source?: string;
}

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  emoji: string;
  feeds: FeedSource[];
}

function googleNewsTopic(topic: string): FeedSource {
  return { url: `https://news.google.com/rss/headlines/section/topic/${topic}?hl=ko&gl=KR&ceid=KR:ko` };
}

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "ai",
    label: "AI",
    emoji: "🤖",
    feeds: [
      { url: "https://www.aitimes.com/rss/allArticle.xml", source: "AI타임스" },
      { url: "http://rss.etnews.com/04046.xml", source: "전자신문" },
    ],
  },
  {
    key: "it",
    label: "IT",
    emoji: "💻",
    feeds: [
      { url: "http://rss.etnews.com/03.xml", source: "전자신문" },
      { url: "https://www.hankyung.com/feed/it", source: "한국경제" },
      { url: "https://news.hada.io/rss/news", source: "긱뉴스" },
    ],
  },
  {
    key: "business",
    label: "경제",
    emoji: "💰",
    feeds: [
      { url: "https://www.hankyung.com/feed/economy", source: "한국경제" },
      { url: "https://www.hankyung.com/feed/finance", source: "한국경제" },
      { url: "http://rss.etnews.com/02.xml", source: "전자신문" },
    ],
  },
  { key: "politics", label: "정치", emoji: "🏛️", feeds: [googleNewsTopic("NATION")] },
  { key: "world", label: "세계", emoji: "🌍", feeds: [googleNewsTopic("WORLD")] },
  { key: "sports", label: "스포츠", emoji: "⚽", feeds: [googleNewsTopic("SPORTS")] },
  { key: "entertainment", label: "연예", emoji: "🎬", feeds: [googleNewsTopic("ENTERTAINMENT")] },
];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
