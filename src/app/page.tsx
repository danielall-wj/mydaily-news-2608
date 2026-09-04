import { CATEGORIES } from "@/lib/categories";
import { readRecentArticles } from "@/lib/newsStore";
import { extractTrendingKeywords } from "@/lib/trending";
import NewsExplorer from "@/components/NewsExplorer";
import ThemeToggle from "@/components/ThemeToggle";

export const revalidate = 3600;

export default async function Home() {
  // readRecentArticles already buckets by KST calendar day (see data/news/YYYY-MM-DD.json),
  // so no further date filtering is needed — filtering again by comparing UTC ISO strings
  // against a KST date string would silently drop everything near local midnight.
  const articles = await readRecentArticles(2);
  const trending = extractTrendingKeywords(articles, 12);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold">📰 오늘의 트렌드 뉴스</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              2시간마다 자동 수집 · 분야별 정리 · 마지막 갱신 기준 총 {articles.length}건
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <NewsExplorer categories={CATEGORIES} articles={articles} trending={trending} />
    </div>
  );
}
