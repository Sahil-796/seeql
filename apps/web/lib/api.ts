import type {
  QuickRunRequest,
  QueryResult,
  PlaygroundExecuteRequest,
  CreateSessionResponse,
  SessionSchemaResponse,
  HealthResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || "An unexpected error occurred",
      response.status
    );
  }

  return data as T;
}

export const api = {
  /**
   * Check API health status
   */
  health: async (): Promise<HealthResponse> => {
    return fetchApi<HealthResponse>("/health");
  },

  /**
   * Quick-run: Execute SQL query with auto-generated mock data
   */
  quickRun: async (sql: string): Promise<QueryResult> => {
    const request: QuickRunRequest = { sql };
    return fetchApi<QueryResult>("/quick-run", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /**
   * Playground: Create a new session
   */
  createSession: async (): Promise<CreateSessionResponse> => {
    return fetchApi<CreateSessionResponse>("/playground/session", {
      method: "POST",
    });
  },

  /**
   * Playground: Close a session
   */
  closeSession: async (sessionId: string): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>(`/playground/session/${sessionId}`, {
      method: "DELETE",
    });
  },

  /**
   * Playground: Execute SQL in a session
   */
  executePlayground: async (
    sessionId: string,
    sql: string
  ): Promise<QueryResult> => {
    const request: PlaygroundExecuteRequest = { sql };
    return fetchApi<QueryResult>(`/playground/session/${sessionId}/execute`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /**
   * Playground: Get session schema (all tables)
   */
  getSessionSchema: async (
    sessionId: string
  ): Promise<SessionSchemaResponse> => {
    return fetchApi<SessionSchemaResponse>(`/playground/session/${sessionId}/schema`, {
      method: "GET",
    });
  },
};

export { ApiError };
