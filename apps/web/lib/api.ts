import type {
  InferRequest,
  InferResponse,
  GenerateRequest,
  GenerateResponse,
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
   * Infer schema from a SQL query
   */
  inferSchema: async (sql: string): Promise<InferResponse> => {
    const request: InferRequest = { sql };
    return fetchApi<InferResponse>("/infer", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /**
   * Generate mock data for a SQL query
   */
  generateData: async (
    sql: string,
    rowsPerTable: number = 10
  ): Promise<GenerateResponse> => {
    const request: GenerateRequest = {
      sql,
      rows_per_table: rowsPerTable,
    };
    return fetchApi<GenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

export { ApiError };
