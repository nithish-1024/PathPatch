import type { AnalysisRun, AuthSession, ProgressEvent, User } from "../types/patchpath";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = typeof body.detail === "string" ? body.detail : message;
    } catch { /* keep the stable fallback */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>("/api/v1/health"),
  authConfig: () => request<{ demo_login_enabled: boolean; environment: string; cookie_secure: boolean }>("/api/v1/auth/config"),
  demo: (mode: string) => request<AnalysisRun>(`/api/v1/demos/${mode}`),
  demoLogin: async () => {
    const session = await request<AuthSession>("/api/v1/auth/demo-login", { method: "POST" });
    return session.user;
  },
  login: async (email: string, password: string) => {
    const session = await request<AuthSession>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return session.user;
  },
  register: async (email: string, full_name: string, password: string, department: string) => {
    const session = await request<AuthSession>("/api/v1/auth/register", { method: "POST", body: JSON.stringify({ email, full_name, password, department }) });
    return session.user;
  },
  logout: () => request<{ status: string }>("/api/v1/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/v1/auth/me"),
  runs: () => request<AnalysisRun[]>("/api/v1/runs"),
  analyze: (title: string, raw_input: string, department_lens: string, analysis_type: "repository" | "circuit" | "truss" | "beam" | "idea", repository_files?: Record<string, string>) => request<AnalysisRun>("/api/v1/upskiller/analyze", { method: "POST", body: JSON.stringify({ title, raw_input, department_lens, analysis_type, ...(repository_files ? { repository_files } : {}) }) }),
  latestSimulation: (runId: string) => request<{ execution_id?: string; status: string; result?: Record<string, unknown>; error?: string; logs: ProgressEvent[] }>(`/api/v1/runs/${runId}/latest-simulation`),
  simulationStatus: (executionId: string) => request<{ execution_id: string; status: string; result?: Record<string, unknown>; error?: string; logs: ProgressEvent[] }>(`/api/v1/simulations/${executionId}`),
};

export async function streamSimulation(
  runId: string,
  planId: string,
  onProgress: (event: ProgressEvent) => void,
  onComplete: (result: Record<string, unknown>) => void,
  signal?: AbortSignal,
) {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });
  const response = await fetch(`${API_BASE}/api/v1/simulate/${runId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_id: planId }),
    signal,
    credentials: "include",
  });
  if (!response.ok || !response.body) {
    let message = `Simulation request failed (${response.status})`;
    try {
      const err = await response.json();
      message = typeof err.detail === "string" ? err.detail : message;
    } catch { /* use fallback */ }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const block of events) {
      const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine.slice(5).trim());
        if (eventName === "progress") onProgress(data as ProgressEvent);
        if (eventName === "complete") onComplete(data as Record<string, unknown>);
      } catch {
        /* skip invalid json in stream */
      }
    }
  }
}
