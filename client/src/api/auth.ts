import { apiFetch } from './client';

export interface PublicUser {
  id: string;
  email: string;
  premiumCredits: number;
  isAdmin?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
  civilization: { id: string; name: string; level: number } | null;
}

export function register(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return apiFetch<MeResponse>('/api/auth/me');
}
