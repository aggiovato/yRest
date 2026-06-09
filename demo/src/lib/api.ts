export const API_BASE = "http://localhost:3070/api";

export interface ApiResult {
  status: number;
  data: unknown;
  url: string;
  total: string | null;
}

export async function fetchApi(
  method: string,
  path: string,
  body: unknown = null
): Promise<ApiResult> {
  const url = `${API_BASE}${path}`;
  const opts: RequestInit = { method };
  // Only set Content-Type when there is a body — some servers (including Fastify)
  // reject requests that declare application/json but send an empty body.
  if (body != null) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }

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
