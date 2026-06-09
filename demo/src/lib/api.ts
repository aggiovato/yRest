export const API_BASE = "http://localhost:3070/api";

export interface ApiResult {
  status: number;
  data: unknown;
  url: string;
  total: string | null;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#3fb950",
  POST: "#f0883e",
  PATCH: "#58a6ff",
  PUT: "#58a6ff",
  DELETE: "#f85149",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function fetchApi(
  method: string,
  path: string,
  body: unknown = null
): Promise<ApiResult> {
  const url = `${API_BASE}${path}`;
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body != null) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const total = res.headers.get("X-Total-Count");
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data, url, total };
  } catch {
    return {
      status: 0,
      data: { error: "Cannot connect to yrest (localhost:3070)" },
      url,
      total: null,
    };
  }
}

export function renderLog(
  logId: string,
  method: string,
  url: string,
  status: number,
  data: unknown
): void {
  const el = document.getElementById(logId);
  if (!el) return;

  const mc = METHOD_COLORS[method] ?? "#8b949e";
  const sc = status >= 200 && status < 300 ? "#3fb950" : status === 0 ? "#8b949e" : "#f85149";

  el.innerHTML = `
    <div class="api-log-request">
      <span class="log-method" style="color:${mc}">${method}</span>
      <span class="log-url">${esc(url)}</span>
      <span class="log-status" style="color:${sc}">${status || "×"}</span>
    </div>
    <pre class="api-log-body">${esc(JSON.stringify(data, null, 2))}</pre>
  `;
}
