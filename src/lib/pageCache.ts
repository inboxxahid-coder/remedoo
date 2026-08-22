// Generic stale-while-revalidate cache for page data.
// Paints last-known content instantly on slow networks, then revalidates.

const PREFIX = "remedoo_page_cache_v1:";
const DEFAULT_TTL = 30 * 60 * 1000; // 30 min

export const readPageCache = <T = any>(key: string, ttlMs: number = DEFAULT_TTL): T | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > ttlMs) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
};

export const writePageCache = (key: string, data: unknown) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode — ignore */
  }
};

// Run non-critical work when the browser is idle (falls back to a short timeout).
export const runWhenIdle = (fn: () => void, timeout = 1500) => {
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === "function") ric(() => fn(), { timeout });
  else setTimeout(fn, 1);
};
