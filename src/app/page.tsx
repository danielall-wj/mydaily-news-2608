import { CATEGORIES } from "@/lib/categories";
import { readRecentArticles } from "@/lib/newsStore";
import { extractTrendingKeywords } from "@/lib/trending";

export const revalidate = 3600;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default async function Home() {
  // readRecentArticles already buckets by KST calendar day (see data/news/YYYY-MM-DD.json),
  // so no further date filtering is needed — filtering again by comparing UTC ISO strings
  // against a KST date string would silently drop everything near local midnight.
  const articles = await readRecentArticles(2);
  const trending = extractTrendingKeywords(articles, 12);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold">📰 오늘의 트렌드 뉴스</h1>
          <p className="mt-1 text-sm text-neutral-500">
            2시간마다 자동 수집 · 분야별 정리 · 마지막 갱신 기준 총 {articles.length}건
          </p>
        </div>
      </header>

      {trending.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-violet-700">🔥 급상승 키워드</h2>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <span
                  key={t.keyword}
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium text-violet-700 shadow-sm"
                >
                  {t.keyword} <span className="text-violet-400">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-8">
        {CATEGORIES.map((category) => {
          const categoryArticles = articles
            .filter((a) => a.category === category.key)
            .slice(0, 12);

          if (categoryArticles.length === 0) return null;

          return (
            <section key={category.key}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                <span className="text-sm font-normal text-neutral-400">
                  {categoryArticles.length}건
                </span>
              </h2>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                {categoryArticles.map((article) => (
                  <li key={article.id} className="px-4 py-3">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-800 hover:text-blue-600 hover:underline"
                    >
                      {article.title}
                    </a>
                    <div className="mt-1 text-xs text-neutral-400">
                      {article.source} · {timeAgo(article.pubDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {articles.length === 0 && (
          <p className="text-center text-neutral-400">
            아직 수집된 뉴스가 없습니다. GitHub Actions 워크플로우가 실행되면 이곳에 표시됩니다.
          </p>
        )}
      </main>
    </div>
  );
}
