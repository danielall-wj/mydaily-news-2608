import type { CategoryKey } from "./categories";

export interface Article {
  id: string;
  title: string;
  link: string;
  source: string;
  category: CategoryKey;
  pubDate: string;
  collectedAt: string;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
}
