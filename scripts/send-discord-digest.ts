import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "../src/lib/categories";
import { readArticlesForDate } from "../src/lib/newsStore";
import { extractTrendingKeywords } from "../src/lib/trending";
import { kstDateString } from "../src/lib/date";
import type { Article } from "../src/lib/types";

const SUMMARY_MODEL = "claude-haiku-4-5-20251001";
const MAX_TITLES_PER_CATEGORY = 25;
const CATEGORY_COLORS: Record<string, number> = {
  politics: 0x6b7280,
  business: 0xf59e0b,
  tech: 0x3b82f6,
  world: 0x10b981,
  sports: 0xef4444,
  entertainment: 0xec4899,
};

async function summarizeCategory(
  client: Anthropic,
  categoryLabelText: string,
  articles: Article[],
): Promise<string> {
  const titles = articles.slice(0, MAX_TITLES_PER_CATEGORY).map((a) => `- ${a.title} (${a.source})`);

  const message = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          `다음은 오늘 "${categoryLabelText}" 분야에서 수집된 뉴스 제목 목록이다.`,
          `중복되거나 비슷한 내용을 묶어서, 오늘 가장 중요한 이슈 3~5개를 한국어 불릿(-)으로 간결하게 요약해줘.`,
          `각 불릿은 한 줄, 이모지나 서두 설명 없이 핵심만 작성해.`,
          "",
          titles.join("\n"),
        ].join("\n"),
      },
    ],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || "요약할 기사가 없습니다.";
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL env var is required");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY env var is required");

  const client = new Anthropic({ apiKey });
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

  for (const category of CATEGORIES) {
    const categoryArticles = articles.filter((a) => a.category === category.key);
    if (categoryArticles.length === 0) continue;

    const summary = await summarizeCategory(client, category.label, categoryArticles);
    const topLinks = categoryArticles
      .slice(0, 3)
      .map((a) => `[${a.title}](${a.link})`)
      .join("\n");

    embeds.push({
      title: `${category.emoji} ${category.label} (${categoryArticles.length}건)`,
      description: `${summary}\n\n${topLinks}`.slice(0, 4096),
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
