import Parser from "rss-parser";
import crypto from "crypto";
import { CATEGORIES, type CategoryConfig, type FeedSource } from "../src/lib/categories";
import { readArticlesForDate, writeArticlesForDate } from "../src/lib/newsStore";
import { kstDateString } from "../src/lib/date";
import type { Article } from "../src/lib/types";

const parser = new Parser({ timeout: 15_000 });
const MAX_PER_CATEGORY_PER_DAY = 80;

function articleId(link: string): string {
  return crypto.createHash("sha1").update(link).digest("hex").slice(0, 16);
}

// Google News titles are formatted as "Headline - Source"; explicitly-sourced feeds
// (etnews, hankyung, ...) keep their title as-is.
function splitTitleSource(raw: string): [string, string | undefined] {
  const idx = raw.lastIndexOf(" - ");
  if (idx === -1) return [raw, undefined];
  return [raw.slice(0, idx), raw.slice(idx + 3)];
}

async function collectFeed(
  feed: FeedSource,
  category: CategoryConfig,
): Promise<Article[]> {
  const now = new Date().toISOString();

  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? []).map((item) => {
      const link = item.link ?? "";
      const rawTitle = item.title ?? "(제목 없음)";
      const [title, parsedSource] = feed.source
        ? [rawTitle, feed.source]
        : splitTitleSource(rawTitle);

      return {
        id: articleId(link),
        title,
        link,
        source: parsedSource ?? parsed.title ?? "알 수 없음",
        category: category.key,
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : now,
        collectedAt: now,
      };
    });
  } catch (err) {
    console.error(`[collect-news] Failed to fetch ${category.label} feed (${feed.url}):`, err);
    return [];
  }
}

async function collectCategory(category: CategoryConfig): Promise<Article[]> {
  const perFeed = await Promise.all(category.feeds.map((feed) => collectFeed(feed, category)));
  return perFeed.flat();
}

async function main() {
  const today = kstDateString();
  const existing = await readArticlesForDate(today);
  const existingById = new Map(existing.map((a) => [a.id, a]));

  const results = await Promise.all(CATEGORIES.map(collectCategory));

  let addedCount = 0;
  for (const categoryArticles of results) {
    for (const article of categoryArticles) {
      if (!article.link) continue;
      if (!existingById.has(article.id)) {
        existingById.set(article.id, article);
        addedCount++;
      }
    }
  }

  // Cap per category to keep the daily file from growing unbounded.
  const byCategory = new Map<string, Article[]>();
  for (const article of existingById.values()) {
    const list = byCategory.get(article.category) ?? [];
    list.push(article);
    byCategory.set(article.category, list);
  }

  const capped: Article[] = [];
  for (const list of byCategory.values()) {
    list.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    capped.push(...list.slice(0, MAX_PER_CATEGORY_PER_DAY));
  }

  await writeArticlesForDate(today, capped);
  console.log(
    `[collect-news] ${today}: +${addedCount} new articles, ${capped.length} total stored.`,
  );
}

main().catch((err) => {
  console.error("[collect-news] Fatal error:", err);
  process.exit(1);
});
