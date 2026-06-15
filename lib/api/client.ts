export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
  error: { code?: string; details?: unknown } | null;
};

export async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === null) {
    throw new Error(payload?.message ?? "Request failed");
  }
  return payload.data;
}

export function jsonRequest(method: string, data?: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) };
}
