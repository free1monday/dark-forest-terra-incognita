import { AUTH_TOKEN_KEY } from '@shared';

/**
 * API base URL:
 * - Production / Vercel: relative "" so fetch('/api/...') hits same origin (rewrites → serverless).
 * - Optional override: VITE_API_URL=https://api.example.com (no trailing slash).
 * - Local Vite: leave empty; vite.config proxies /api → http://127.0.0.1:4000.
 */
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const h = new Headers(headers);
  if (!h.has('Content-Type') && rest.body) {
    h.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getToken();
    if (token) h.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers: h });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Нет связи с сервером. Проверьте, что API запущен.', 0);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      err?.error?.code ?? 'HTTP_ERROR',
      err?.error?.message ?? `Ошибка сервера (${res.status})`,
      res.status
    );
  }

  return data as T;
}

export function getApiUrl(): string {
  return API_URL;
}
