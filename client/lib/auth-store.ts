/**
 * Auth store for EthioHelp AI.
 * Calls the Express backend API for all auth operations.
 * Data is persisted in MongoDB via the backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

function getAuthHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: SafeUser; token: string } | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Signup failed." };
    return { user: data.user, token: data.token };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: SafeUser; token: string } | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Login failed." };
    return { user: data.user, token: data.token };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export async function getSessionUser(
  token: string
): Promise<SafeUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(token),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function deleteSession(token?: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: token ? getAuthHeaders(token) : {},
      credentials: "include",
    });
  } catch {
    // Silently fail
  }
}
