// Lightweight stale-while-revalidate cache for the patient dashboard.
// Keeps the home page instant on slow networks by painting last-known data
// immediately, then refreshing in the background.

const KEY = "remedoo_dashboard_cache_v1";
const TTL_MS = 30 * 60 * 1000; // keep showing cached content for 30 min

export type DashboardCache = Record<string, any>;

export const readDashboardCache = (): DashboardCache | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.data as DashboardCache;
  } catch {
    return null;
  }
};

export const writeDashboardCache = (data: DashboardCache) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode — ignore */
  }
};
