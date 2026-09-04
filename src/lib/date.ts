const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Returns YYYY-MM-DD for the given instant, in Asia/Seoul time. */
export function kstDateString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

export function daysAgoKstDateStrings(days: number, from: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(kstDateString(d));
  }
  return result;
}
