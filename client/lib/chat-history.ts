/**
 * Chat history store for EthioHelp AI.
 * Calls the Express backend API for all chat history operations.
 * Data is persisted in MongoDB via the backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function createSession(
  token: string,
  title: string
): Promise<ChatSession | null> {
  try {
    const res = await fetch(`${API_URL}/history`, {
      method: "POST",
      headers: authHeaders(token),
      credentials: "include",
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session;
  } catch {
    return null;
  }
}

export async function getUserSessions(
  token: string
): Promise<Omit<ChatSession, "messages">[]> {
  try {
    const res = await fetch(`${API_URL}/history`, {
      headers: authHeaders(token),
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch {
    return [];
  }
}

export async function getSession(
  token: string,
  sessionId: string
): Promise<ChatSession | null> {
  try {
    const res = await fetch(`${API_URL}/history/${sessionId}`, {
      headers: authHeaders(token),
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session;
  } catch {
    return null;
  }
}

export async function addMessage(
  token: string,
  sessionId: string,
  role: "user" | "assistant",
  text: string
): Promise<ChatMessage | null> {
  try {
    const res = await fetch(`${API_URL}/history/${sessionId}/messages`, {
      method: "POST",
      headers: authHeaders(token),
      credentials: "include",
      body: JSON.stringify({ role, text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message;
  } catch {
    return null;
  }
}

export async function deleteSession(
  token: string,
  sessionId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/history/${sessionId}`, {
      method: "DELETE",
      headers: authHeaders(token),
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
