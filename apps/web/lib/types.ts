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

export interface InferRequest {
  sql: string;
}

export interface GenerateRequest {
  sql: string;
  rows_per_table?: number;
}

// ============ API Response Types ============

export interface InferResponse {
  schema?: Schema;
  error?: string;
}

export interface GenerateResponse {
  data?: Record<string, Record<string, unknown>[]>;
  error?: string;
}

export interface HealthResponse {
  status: string;
}

// ============ UI State Types ============

export interface QueryState {
  sql: string;
  schema: Schema | null;
  data: Record<string, Record<string, unknown>[]> | null;
  isLoading: boolean;
  error: string | null;
}
