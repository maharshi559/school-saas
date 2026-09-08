import type { AuthResponse } from "@iskool/shared";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const PREFIX = `${BASE}/api/v1`;

const TOKEN_KEY = "school.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode â€” session stays in memory only */
  }
}

type Options = RequestInit & { tenantId?: string };

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { tenantId, headers, ...rest } = opts;
  const res = await fetch(`${PREFIX}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message ?? body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const auth = {
  requestOtp: (phone: string) =>
    apiFetch<{ ok: boolean; ttlSeconds: number }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string) =>
    apiFetch<AuthResponse>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};
