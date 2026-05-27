import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEV_BASE_URL = "https://api.studex.com.ng";
const PROD_BASE_URL = "https://api.studex.com.ng";

export const API_BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// ─────────────────────────────────────────
// Storage helpers — SecureStore on native, localStorage on web
// ─────────────────────────────────────────
const store = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),

  set: (key: string, value: string): Promise<void> =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),

  del: (key: string): Promise<void> =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

// ─────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────
export const getAccessToken = (): Promise<string | null> =>
  store.get(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): Promise<string | null> =>
  store.get(REFRESH_TOKEN_KEY);

export const saveTokens = async (access: string, refresh: string): Promise<void> => {
  await Promise.all([
    store.set(ACCESS_TOKEN_KEY, access),
    store.set(REFRESH_TOKEN_KEY, refresh),
  ]);
};

export const clearTokens = async (): Promise<void> => {
  await Promise.all([
    store.del(ACCESS_TOKEN_KEY),
    store.del(REFRESH_TOKEN_KEY),
  ]);
};

// ─────────────────────────────────────────
// refreshToken — called automatically by fetchWithAuth on 401.
// The web app relies on httpOnly cookie; mobile stores the refresh token in
// SecureStore and sends it in the request body instead.
// ─────────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const refreshToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const storedRefresh = await getRefreshToken();

      const res = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send refresh token in body for mobile since httpOnly cookies aren't available
        ...(storedRefresh ? { body: JSON.stringify({ refresh: storedRefresh }) } : {}),
      });

      if (!res.ok) {
        await clearTokens();
        throw new Error("Session expired. Please log in again.");
      }

      const data = await res.json();
      const newAccess: string | undefined = data.access;
      const newRefresh: string | undefined = data.refresh;

      if (!newAccess) {
        await clearTokens();
        throw new Error("Session expired. Please log in again.");
      }

      await store.set(ACCESS_TOKEN_KEY, newAccess);
      if (newRefresh) {
        await store.set(REFRESH_TOKEN_KEY, newRefresh);
      }

      return newAccess;
    } catch (err) {
      await clearTokens();
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─────────────────────────────────────────
// buildHeaders — attaches Authorization header and Content-Type.
// ─────────────────────────────────────────
const buildHeaders = (token: string | null, existing?: HeadersInit): Headers => {
  const headers = new Headers(existing ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

// ─────────────────────────────────────────
// parseError — extracts a readable message from a failed response.
// Checks "detail" first (DRF standard), then falls back to status text.
// ─────────────────────────────────────────
const parseError = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data === "string") return data;
    return JSON.stringify(data);
  } catch {
    return res.statusText || `Request failed with status ${res.status}`;
  }
};

// ─────────────────────────────────────────
// fetchWithAuth — authenticated fetch wrapper.
// Mirrors the web app's fetchWithAuth() in src/lib/authStore.ts.
// On 401: refreshes access token via refreshToken() and retries once.
// On second 401: clears tokens and throws so the app can redirect to login.
// ─────────────────────────────────────────
export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = await getAccessToken();

  const makeRequest = (t: string | null): Promise<Response> =>
    fetch(url, {
      ...options,
      headers: buildHeaders(t, options.headers),
    });

  let response = await makeRequest(token);

  if (response.status === 401) {
    try {
      const newToken = await refreshToken();
      response = await makeRequest(newToken);
    } catch {
      // refreshToken already cleared tokens and threw; re-throw for caller
      throw new Error("Session expired. Please log in again.");
    }

    if (response.status === 401) {
      await clearTokens();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
};

// ─────────────────────────────────────────
// api — convenience methods that call fetchWithAuth and throw on non-2xx.
// ─────────────────────────────────────────
const request = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const startMs = Date.now();
  console.log(`[API] ${options.method ?? "GET"} ${url} — started`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[API] TIMEOUT after ${Date.now() - startMs}ms — aborting ${url}`);
    controller.abort();
  }, 60000);
  try {
    const res = await fetchWithAuth(endpoint, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`[API] ${res.status} ${url} — ${Date.now() - startMs}ms`);
    if (!res.ok) {
      const message = await parseError(res);
      throw new Error(message);
    }
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[API] ERROR ${url} — ${err.name}: ${err.message} (after ${Date.now() - startMs}ms)`);
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
};

export const api = {
  get: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
