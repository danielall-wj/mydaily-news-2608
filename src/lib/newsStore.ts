import { promises as fs } from "fs";
import path from "path";
import type { Article } from "./types";
import { daysAgoKstDateStrings } from "./date";

const DATA_DIR = path.join(process.cwd(), "data", "news");

function fileForDate(dateStr: string): string {
  return path.join(DATA_DIR, `${dateStr}.json`);
}

export async function readArticlesForDate(dateStr: string): Promise<Article[]> {
  try {
    const raw = await fs.readFile(fileForDate(dateStr), "utf-8");
    return JSON.parse(raw) as Article[];
  } catch {
    return [];
  }
}

export async function writeArticlesForDate(dateStr: string, articles: Article[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const sorted = [...articles].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );
  await fs.writeFile(fileForDate(dateStr), JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

/** Reads and merges articles across the last `days` KST calendar days, newest first. */
export async function readRecentArticles(days: number): Promise<Article[]> {
  const dateStrs = daysAgoKstDateStrings(days);
  const perDay = await Promise.all(dateStrs.map(readArticlesForDate));
  return perDay
    .flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}
