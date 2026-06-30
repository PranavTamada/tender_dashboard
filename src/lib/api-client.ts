import type {
  StatsResponse,
  Tender,
  TenderListResponse,
} from "@/types/tender";

/** Filters held in dashboard UI state. All optional; empty → omitted. */
export interface TenderFilters {
  q?: string;
  portal?: string;
  sector?: string;
  state?: string;
  department?: string;
  matchType?: string;
  status?: string;
  keyword?: string;
  visited?: boolean;
  closingFrom?: string;
  closingTo?: string;
  minValue?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** Response from POST /api/refresh (live fetch + store). */
export interface RefreshResult {
  ok: boolean;
  refreshed: boolean;
  reason: string;
  lastRefresh: string | null;
}

function buildQuery(filters: TenderFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  tenders: (filters: TenderFilters = {}) =>
    getJson<TenderListResponse>(`/api/tenders${buildQuery(filters)}`),
  tender: (id: string) => getJson<Tender>(`/api/tenders/${id}`),
  stats: () => getJson<StatsResponse>(`/api/stats`),
  refresh: (force = true) =>
    getJson<RefreshResult>(`/api/refresh?force=${force}`, { method: "POST" }),
  setVisited: (id: string, visited: boolean) =>
    getJson<{ ok: boolean; id: string; visited: boolean }>(
      `/api/tenders/${id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visited }),
      },
    ),
  deleteTender: (id: string) =>
    getJson<{ ok: boolean; id: string; deleted: boolean }>(
      `/api/tenders/${id}`,
      { method: "DELETE" },
    ),
};
