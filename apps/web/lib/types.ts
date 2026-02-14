// ============ Core Schema Types ============

export interface Constraints {
  max_length?: number;
  min?: number;
  max?: number;
  unique?: boolean;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  is_primary?: boolean;
  is_foreign?: boolean;
  ref_table?: string;
  ref_column?: string;
  constraints: Constraints;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface Join {
  LeftTable: string;
  LeftColumn: string;
  RightTable: string;
  RightColumn: string;
}

export interface Schema {
  tables: TableSchema[];
  relationships?: Join[];
}

// ============ API Request Types ============

export interface QuickRunRequest {
  sql: string;
}

export interface PlaygroundExecuteRequest {
  sql: string;
}

// ============ API Response Types ============

export interface QueryResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  schema?: Schema;
  error?: string;
}

export interface CreateSessionResponse {
  session_id: string;
  created_at: string;
}

export interface SessionSchemaResponse {
  session_id: string;
  schema: Schema;
}

export interface HealthResponse {
  status: string;
}

// ============ UI State Types ============

export interface QueryState {
  sql: string;
  schema: Schema | null;
  data: Record<string, Record<string, unknown>[]> | null;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  isLoading: boolean;
  error: string | null;
}
