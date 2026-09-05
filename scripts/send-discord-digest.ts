import { CATEGORIES } from "../src/lib/categories";
import { readArticlesForDate } from "../src/lib/newsStore";
import { extractTrendingKeywords } from "../src/lib/trending";
import { kstDateString } from "../src/lib/date";
import type { Article } from "../src/lib/types";

const MAX_TITLES_PER_CATEGORY = 5;
const CATEGORY_COLORS: Record<string, number> = {
  politics: 0x6b7280,
  business: 0xf59e0b,
  tech: 0x3b82f6,
  world: 0x10b981,
  sports: 0xef4444,
  entertainment: 0xec4899,
};

function listTitles(articles: Article[]): string {
  const lines = articles.slice(0, MAX_TITLES_PER_CATEGORY).map((a) => `- [${a.title}](${a.link})`);
  return lines.join("\n") || "수집된 기사가 없습니다.";
}

async function sendToDiscord(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL env var is required");

  const today = kstDateString();
  const articles = await readArticlesForDate(today);

  if (articles.length === 0) {
    console.log("[send-discord-digest] No articles collected today, skipping send.");
    return;
  }

  const trending = extractTrendingKeywords(articles, 8);

  const embeds: Record<string, unknown>[] = [];

  if (trending.length > 0) {
    embeds.push({
      title: "🔥 오늘의 급상승 키워드",
      description: trending.map((t) => `\`${t.keyword}\` (${t.count})`).join("  "),
      color: 0x8b5cf6,
    });
  }

  // TODO: AI 카테고리 요약 재도입 (Anthropic API 키가 워크스페이스에 스코프되면)
  for (const category of CATEGORIES) {
    const categoryArticles = articles.filter((a) => a.category === category.key);
    if (categoryArticles.length === 0) continue;

    embeds.push({
      title: `${category.emoji} ${category.label} (${categoryArticles.length}건)`,
      description: listTitles(categoryArticles).slice(0, 4096),
      color: CATEGORY_COLORS[category.key] ?? 0x6b7280,
    });
  }

  await sendToDiscord(webhookUrl, {
    content: `📰 **${today} 오늘의 뉴스 브리핑**`,
    embeds: embeds.slice(0, 10),
  });

  console.log(`[send-discord-digest] Sent digest for ${today} with ${embeds.length} embeds.`);
}

main().catch((err) => {
  console.error("[send-discord-digest] Fatal error:", err);
  process.exit(1);
});
