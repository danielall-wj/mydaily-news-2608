"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CategoryConfig, CategoryKey } from "@/lib/categories";
import type { Article, TrendingKeyword } from "@/lib/types";

const BOOKMARK_KEY = "mynews:bookmarks";
const EMPTY_BOOKMARKS: ReadonlySet<string> = new Set();
const bookmarkListeners = new Set<() => void>();
let bookmarkCache: Set<string> | null = null;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// Module-level cache + pub/sub so useSyncExternalStore can read localStorage without an
// effect+setState round trip; bookmarkCache stays reference-stable until toggleBookmark runs.
function loadBookmarks(): Set<string> {
  if (bookmarkCache) return bookmarkCache;
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    bookmarkCache = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    bookmarkCache = new Set();
  }
  return bookmarkCache;
}

function subscribeBookmarks(callback: () => void): () => void {
  bookmarkListeners.add(callback);
  return () => bookmarkListeners.delete(callback);
}

function getBookmarksServerSnapshot(): ReadonlySet<string> {
  return EMPTY_BOOKMARKS;
}

function toggleBookmark(id: string): void {
  const next = new Set(loadBookmarks());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  bookmarkCache = next;
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...next]));
  } catch {}
  bookmarkListeners.forEach((listener) => listener());
}

interface NewsExplorerProps {
  categories: CategoryConfig[];
  articles: Article[];
  trending: TrendingKeyword[];
}

export default function NewsExplorer({ categories, articles, trending }: NewsExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const bookmarks = useSyncExternalStore(subscribeBookmarks, loadBookmarks, getBookmarksServerSnapshot);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleCategories = useMemo(
    () => (activeCategory === "all" ? categories : categories.filter((c) => c.key === activeCategory)),
    [categories, activeCategory],
  );

  function matchesFilters(article: Article): boolean {
    if (bookmarkOnly && !bookmarks.has(article.id)) return false;
    if (!normalizedQuery) return true;
    return (
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.source.toLowerCase().includes(normalizedQuery)
    );
  }

  const sections = visibleCategories
    .map((category) => ({
      category,
      items: articles.filter((a) => a.category === category.key && matchesFilters(a)).slice(0, 12),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      {trending.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
            <h2 className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
              🔥 급상승 키워드
            </h2>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <span
                  key={t.keyword}
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium text-violet-700 shadow-sm dark:bg-neutral-900 dark:text-violet-300"
                >
                  {t.keyword} <span className="text-violet-400 dark:text-violet-500">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 pt-6">
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·언론사로 검색"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
              전체
            </FilterChip>
            {categories.map((c) => (
              <FilterChip key={c.key} active={activeCategory === c.key} onClick={() => setActiveCategory(c.key)}>
                {c.emoji} {c.label}
              </FilterChip>
            ))}
            <label className="ml-1 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={bookmarkOnly}
                onChange={(e) => setBookmarkOnly(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              ⭐ 즐겨찾기만{bookmarks.size > 0 ? ` (${bookmarks.size})` : ""}
            </label>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-8">
        {sections.map(({ category, items }) => (
          <section key={category.key}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <span>{category.emoji}</span>
              <span>{category.label}</span>
              <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500">
                {items.length}건
              </span>
            </h2>
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {items.map((article) => (
                <li key={article.id} className="flex items-start gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(article.id)}
                    aria-label={bookmarks.has(article.id) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    className="mt-0.5 shrink-0 text-lg leading-none text-neutral-300 hover:text-amber-400 dark:text-neutral-600 dark:hover:text-amber-300"
                  >
                    {bookmarks.has(article.id) ? "★" : "☆"}
                  </button>
                  <div className="min-w-0">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-800 hover:text-blue-600 hover:underline dark:text-neutral-100 dark:hover:text-blue-400"
                    >
                      {article.title}
                    </a>
                    <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      {article.source} · {timeAgo(article.pubDate)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {sections.length === 0 && (
          <p className="text-center text-neutral-400 dark:text-neutral-500">
            {articles.length === 0
              ? "아직 수집된 뉴스가 없습니다. GitHub Actions 워크플로우가 실행되면 이곳에 표시됩니다."
              : bookmarkOnly
                ? "즐겨찾기한 기사가 없습니다."
                : "조건에 맞는 기사가 없습니다."}
          </p>
        )}
      </main>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
