"use client";

import { apiRequest } from "@/lib/api/client";
import type { ApiResponse, AuthSession, PlatformSession } from "@/types/api";

const SESSION_KEY = "bazi-platform-session-v1";

export function readPlatformSession(): PlatformSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PlatformSession) : null;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writePlatformSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      expiresAt: session.expiresAt,
      token: session.token,
      user: session.user,
    } satisfies PlatformSession)
  );
}

export function clearPlatformSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
}

export async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const session = readPlatformSession();
  return apiRequest<T>(path, {
    ...init,
    headers: {
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init?.headers,
    },
  });
}

export function userRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  return authenticatedRequest<T>(`/user${path}`, init);
}

export function adminRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  return authenticatedRequest<T>(`/admin${path}`, init);
}
