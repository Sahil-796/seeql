"use client";

import {
  Check,
  ChevronDown,
  Code,
  Copy,
  Database,
  GripVertical,
  Link2,
  Loader2,
  Play,
  Plus,
  Shield,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerStatus } from "@/components/ServerStatus";
import { SQLEditor } from "@/components/SQLEditor";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Types
const COLUMN_TYPES = [
  "INTEGER",
  "FLOAT",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "UUID",
  "JSON",
  "EMAIL",
  "URL",
] as const;

type ColumnType = (typeof COLUMN_TYPES)[number];

type ColumnDef = {
  id: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  foreignKey: boolean;
  refTable: string;
  refColumn: string;
};

type TableDef = {
  id: string;
  name: string;
  columns: ColumnDef[];
};

type RowDef = Record<string, string> & { _rowId?: string };

type QueryResult = {
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  error?: string;
};

// Default tables - start empty for fresh sessions
const DEFAULT_TABLES: TableDef[] = [];

// Utilities
function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toIdentifier(value: string) {
  const normalized = value.trim().replace(/\s+/g, "_");
  return normalized.length === 0 ? "unnamed" : normalized;
}

/** Strip cryptic Vitess parser noise like "at position 23" from error messages */
function sanitizeError(msg: string): string {
  return msg
    .replace(/\s+at position \d+/g, "")
    .replace(/^failed to parse SQL:\s*/i, "")
    .replace(/^failed to parse CREATE TABLE:\s*/i, "");
}

function quoteIdentifier(value: string) {
  return "`" + value.replace(/`/g, "``") + "`";
}

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimestamp(value: Date) {
  return value.toISOString();
}

function randomUuid() {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function generateValue(
  column: ColumnDef,
  rowIndex: number,
  totalRows: number,
  tableIndex: number,
) {
  const name = column.name.toLowerCase();

  if (column.type === "INTEGER") {
    if (name === "id") return String(rowIndex + 1 + tableIndex * totalRows);
    if (name.endsWith("_id")) return String((rowIndex % totalRows) + 1);
    return String(100 + rowIndex);
  }

  if (column.type === "FLOAT") {
    const value = 10 + Math.random() * 990;
    return value.toFixed(2);
  }

  if (column.type === "BOOLEAN") {
    return rowIndex % 2 === 0 ? "true" : "false";
  }

  if (column.type === "DATE") {
    const date = new Date();
    date.setDate(date.getDate() - rowIndex);
    return formatDate(date);
  }

  if (column.type === "TIMESTAMP") {
    const date = new Date();
    date.setMinutes(date.getMinutes() - rowIndex * 10);
    return formatTimestamp(date);
  }

  if (column.type === "UUID") {
    return randomUuid();
  }

  if (column.type === "JSON") {
    return JSON.stringify({ index: rowIndex + 1, flag: rowIndex % 2 === 0 });
  }

  if (column.type === "EMAIL") {
    return `user${rowIndex + 1}@seeql.dev`;
  }

  if (column.type === "URL") {
    return `https://seeql.dev/items/${rowIndex + 1}`;
  }

  if (name.includes("name")) return `Sample Name ${rowIndex + 1}`;
  if (name.includes("title")) return `Title ${rowIndex + 1}`;
  if (name.includes("city")) return ["Orion", "Kepler", "Atria"][rowIndex % 3];
  if (name.includes("status"))
    return ["new", "active", "archived"][rowIndex % 3];

  return `Value ${rowIndex + 1}`;
}

function parseValue(rawValue: string, type: ColumnType) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return null;

  if (type === "INTEGER") {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (type === "FLOAT") {
    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (type === "BOOLEAN") {
    return trimmed.toLowerCase() === "true" || trimmed === "1";
  }

  if (type === "JSON") {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function formatValue(value: unknown, type: ColumnType) {
  if (value === null || value === undefined || value === "") return "NULL";

  if (type === "INTEGER" || type === "FLOAT") {
    return String(value);
  }

  if (type === "BOOLEAN") {
    return value === true || value === "true" || value === "1" ? "1" : "0";
  }

  if (type === "JSON") {
    const jsonValue = typeof value === "string" ? value : JSON.stringify(value);
    return `'${escapeSqlString(jsonValue)}'`;
  }

  return `'${escapeSqlString(String(value))}'`;
}

function buildCreateTableSql(table: TableDef) {
  const columnDefs = table.columns.map((col) => {
    const parts = [`${quoteIdentifier(col.name)} ${col.type}`];
    if (col.primary) parts.push("PRIMARY KEY");
    if (!col.nullable) parts.push("NOT NULL");
    if (col.unique && !col.primary) parts.push("UNIQUE");
    return parts.join(" ");
  });

  // Table-level FOREIGN KEY constraints (vitess can't parse inline REFERENCES)
  const fkConstraints = table.columns
    .filter((col) => col.foreignKey && col.refTable && col.refColumn)
    .map(
      (col) =>
        `FOREIGN KEY (${quoteIdentifier(col.name)}) REFERENCES ${quoteIdentifier(col.refTable)}(${quoteIdentifier(col.refColumn)})`,
    );

  const allDefs = [...columnDefs, ...fkConstraints];

  return `CREATE TABLE ${quoteIdentifier(table.name)} (\n  ${allDefs.join(",\n  ")}\n)`;
}

function buildInsertSql(table: TableDef, rows: RowDef[]) {
  if (rows.length === 0) return [];

  const colNames = table.columns.map((col) => quoteIdentifier(col.name));

  return rows.map((row) => {
    const values = table.columns.map((col) => {
      const parsed = parseValue(row[col.name] ?? "", col.type);
      return formatValue(parsed, col.type);
    });

    return `INSERT INTO ${quoteIdentifier(table.name)} (${colNames.join(", ")}) VALUES (${values.join(", ")})`;
  });
}

function normalizeColumnType(type: string): ColumnType {
  const upper = type.toUpperCase();
  if (upper.startsWith("INT")) return "INTEGER";
  if (upper.startsWith("FLOAT") || upper.startsWith("DOUBLE")) return "FLOAT";
  if (upper.startsWith("DECIMAL")) return "FLOAT";
  if (upper.startsWith("BOOL")) return "BOOLEAN";
  if (upper.startsWith("DATE")) return "DATE";
  if (upper.startsWith("TIMESTAMP")) return "TIMESTAMP";
  if (upper.startsWith("UUID")) return "UUID";
  if (upper.startsWith("JSON")) return "JSON";
  if (upper.startsWith("EMAIL")) return "EMAIL";
  if (upper.startsWith("URL")) return "URL";
  return "TEXT";
}

function sessionTableToTableDef(table: SessionTable): TableDef {
  return {
    id: `session:${table.name}`,
    name: table.name,
    columns: table.columns.map((col) => ({
      id: createId("col"),
      name: col.name,
      type: normalizeColumnType(col.type),
      nullable: true,
      primary: Boolean(col.is_primary),
      unique: false,
      foreignKey: false,
      refTable: "",
      refColumn: "",
    })),
  };
}
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type RefTarget = { name: string; columns: string[] };

// Components
function ColumnRow({
  column,
  onUpdate,
  onRemove,
  refTargets,
}: {
  column: ColumnDef;
  onUpdate: (updater: (col: ColumnDef) => ColumnDef) => void;
  onRemove: () => void;
  refTargets: RefTarget[];
}) {
  const refTableDef = refTargets.find((t) => t.name === column.refTable);

  const typeColors: Record<string, string> = {
    INTEGER: "text-blue-500",
    FLOAT: "text-cyan-500",
    TEXT: "text-emerald-500",
    BOOLEAN: "text-amber-500",
    DATE: "text-violet-500",
    TIMESTAMP: "text-violet-500",
    UUID: "text-pink-500",
    JSON: "text-orange-500",
    EMAIL: "text-sky-500",
    URL: "text-sky-500",
  };

  return (
    <div className="group">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/60 transition-colors">
        {/* drag handle */}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 cursor-grab" />

        {/* column name */}
        <Input
          value={column.name}
          onChange={(e) =>
            onUpdate((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={(e) =>
            onUpdate((prev) => ({
              ...prev,
              name: toIdentifier(e.target.value),
            }))
          }
          className="h-7 text-sm flex-1 min-w-0 font-mono border-0 bg-transparent shadow-none focus-visible:ring-1 px-1.5"
          placeholder="column_name"
        />

        {/* type selector */}
        <Select
          value={column.type}
          onValueChange={(value) =>
            onUpdate((prev) => ({ ...prev, type: value as ColumnType }))
          }
        >
          <SelectTrigger
            className={cn(
              "w-28 h-7 text-xs font-mono border-0 bg-muted/50 shadow-none",
              typeColors[column.type],
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMN_TYPES.map((type) => (
              <SelectItem
                key={type}
                value={type}
                className={cn("text-xs font-mono", typeColors[type])}
              >
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* constraint pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Primary Key"
            onClick={() =>
              onUpdate((prev) => ({
                ...prev,
                primary: !prev.primary,
                unique: !prev.primary ? true : prev.unique,
              }))
            }
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-colors text-[10px] font-bold",
              column.primary
                ? "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/40"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60",
            )}
          >
            PK
          </button>
          <button
            type="button"
            title="Not Null"
            onClick={() =>
              onUpdate((prev) => ({ ...prev, nullable: !prev.nullable }))
            }
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-colors",
              !column.nullable
                ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Shield className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Unique"
            onClick={() =>
              onUpdate((prev) => ({ ...prev, unique: !prev.unique }))
            }
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-colors text-[10px] font-bold",
              column.unique && !column.primary
                ? "bg-purple-500/15 text-purple-500 ring-1 ring-purple-500/30"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60",
            )}
          >
            U
          </button>
          <button
            type="button"
            title="Foreign Key"
            onClick={() =>
              onUpdate((prev) => ({
                ...prev,
                foreignKey: !prev.foreignKey,
                refTable: !prev.foreignKey ? prev.refTable : "",
                refColumn: !prev.foreignKey ? prev.refColumn : "",
              }))
            }
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center transition-colors",
              column.foreignKey
                ? "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30"
                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Link2 className="h-3 w-3" />
          </button>
        </div>

        {/* remove */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive shrink-0"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* FK sub-row */}
      {column.foreignKey && (
        <div className="flex items-center gap-2 pl-9 pr-3 pb-2">
          <Link2 className="h-3 w-3 text-blue-400 shrink-0" />
          <Select
            value={column.refTable}
            onValueChange={(value) =>
              onUpdate((prev) => ({
                ...prev,
                refTable: value,
                refColumn: "",
              }))
            }
          >
            <SelectTrigger className="h-6 text-xs w-32 border-blue-500/20 bg-blue-500/5">
              <SelectValue placeholder="table" />
            </SelectTrigger>
            <SelectContent>
              {refTargets.length === 0 ? (
                <SelectItem
                  value="_none"
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  no other tables yet
                </SelectItem>
              ) : (
                refTargets.map((t) => (
                  <SelectItem
                    key={t.name}
                    value={t.name}
                    className="text-xs font-mono"
                  >
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground/50 text-xs">.</span>
          <Select
            value={column.refColumn}
            onValueChange={(value) =>
              onUpdate((prev) => ({ ...prev, refColumn: value }))
            }
          >
            <SelectTrigger className="h-6 text-xs w-32 border-blue-500/20 bg-blue-500/5">
              <SelectValue placeholder="column" />
            </SelectTrigger>
            <SelectContent>
              {refTableDef ? (
                refTableDef.columns.map((col) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-xs font-mono"
                  >
                    {col}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="_placeholder" disabled className="text-xs">
                  select a table first
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function TableCard({
  table,
  refTargets,
  onUpdate,
  onRemove,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  isDuplicateName,
}: {
  table: TableDef;
  refTargets: RefTarget[];
  onUpdate: (updater: (t: TableDef) => TableDef) => void;
  onRemove: () => void;
  onAddColumn: () => void;
  onUpdateColumn: (
    columnId: string,
    updater: (col: ColumnDef) => ColumnDef,
  ) => void;
  onRemoveColumn: (columnId: string) => void;
  isDuplicateName?: boolean;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border/50 shadow-sm hover:border-border/70 transition-all">
      {/* Table header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/40 border-b-border/40">
        <div className="h-5 w-5 rounded flex items-center justify-center shrink-0 bg-primary/10">
          <TableIcon className="h-3 w-3 text-primary" />
        </div>

        <Input
          value={table.name}
          onChange={(e) =>
            onUpdate((prev) => ({ ...prev, name: e.target.value }))
          }
          onBlur={(e) =>
            onUpdate((prev) => ({
              ...prev,
              name: toIdentifier(e.target.value),
            }))
          }
          className={cn(
            "h-7 font-mono font-semibold text-sm flex-1 border-0 bg-transparent shadow-none px-1.5",
            isDuplicateName
              ? "focus-visible:ring-1 ring-1 ring-destructive/70 text-destructive"
              : "focus-visible:ring-1",
          )}
          title={
            isDuplicateName
              ? "A table with this name already exists"
              : undefined
          }
          placeholder="table_name"
        />

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {table.columns.length} col{table.columns.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onAddColumn}
          >
            <Plus className="h-3 w-3 mr-1" />
            col
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Column header row */}
      {table.columns.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-border/30 bg-muted/15">
          <span className="w-3.5 shrink-0" />
          <span className="flex-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1.5">
            name
          </span>
          <span className="w-28 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            type
          </span>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            <span className="w-6 text-center">PK</span>
            <span className="w-6 text-center">NN</span>
            <span className="w-6 text-center">UQ</span>
            <span className="w-6 text-center">FK</span>
          </span>
          <span className="w-6 shrink-0" />
        </div>
      )}

      {/* Columns */}
      <div className="divide-y divide-border/25">
        {table.columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            onUpdate={(updater) => onUpdateColumn(column.id, updater)}
            onRemove={() => onRemoveColumn(column.id)}
            refTargets={refTargets}
          />
        ))}
      </div>

      {/* Empty state */}
      {table.columns.length === 0 && (
        <div className="px-3 py-6 text-center">
          <p className="text-xs text-muted-foreground mb-2">No columns yet</p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onAddColumn}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add column
          </Button>
        </div>
      )}
    </div>
  );
}

function DataPreviewTable({
  table,
  rows,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  readOnly,
}: {
  table: TableDef;
  rows: RowDef[];
  onUpdateRow: (rowIndex: number, columnName: string, value: string) => void;
  onRemoveRow: (rowIndex: number) => void;
  onAddRow: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{table.name}</h3>
          <Badge variant="outline" className="text-xs">
            {rows.length} rows
          </Badge>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={onAddRow}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Row
          </Button>
        )}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {table.columns.map((col) => (
                <TableHead key={col.id} className="text-xs font-medium">
                  {col.name}
                </TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={table.columns.length + 1}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No data yet. Use Auto-fill or add rows manually.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, rowIndex) => {
              const rowKey = row._rowId ?? `${table.id}-${rowIndex}`;
              return (
                <TableRow key={rowKey}>
                  {table.columns.map((col) => (
                    <TableCell key={col.id} className="p-1.5">
                      <Input
                        value={row[col.name] ?? ""}
                        onChange={(e) =>
                          onUpdateRow(rowIndex, col.name, e.target.value)
                        }
                        readOnly={readOnly}
                        disabled={readOnly}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-1.5">
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveRow(rowIndex)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ResultsTable({ result }: { result: QueryResult | null }) {
  if (!result?.rows || result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Database className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Run a query to see results</p>
      </div>
    );
  }

  const columns = Object.keys(result.rows[0]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col}
                className="text-xs font-medium whitespace-nowrap"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, rowIndex) => {
            // Use a composite key: row index + first column value for uniqueness
            const rowKey = `row-${rowIndex}-${String(row[columns[0]] ?? "")}`;
            return (
              <TableRow key={rowKey}>
                {columns.map((col) => (
                  <TableCell key={col} className="py-2 text-sm">
                    <span className="max-w-[200px] truncate block">
                      {formatCellValue(row[col])}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Log entry type
type LogEntry = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  timestamp: Date;
};

// Session table type (from API schema)
type SessionTable = {
  name: string;
  columns: {
    name: string;
    type: string;
    is_primary?: boolean;
    is_foreign?: boolean;
    ref_table?: string;
    ref_column?: string;
  }[];
};

// Main Component
export default function PlaygroundPage() {
  const { isServerOnline } = useServerStatus();
  const [tables, setTables] = useState<TableDef[]>(DEFAULT_TABLES);
  const [rowsByTable, setRowsByTable] = useState<Record<string, RowDef[]>>({});
  const [rowsPerTable, setRowsPerTable] = useState(5);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [activeDataTab, setActiveDataTab] = useState<string>(
    tables[0]?.id ?? "",
  );
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([]);
  const [sessionTables, setSessionTables] = useState<SessionTable[]>([]);
  const [isQueryValid, setIsQueryValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [pushedTableIds, setPushedTableIds] = useState<Set<string>>(new Set());
  const [dirtyTableIds, setDirtyTableIds] = useState<Set<string>>(new Set());
  const [autofillTableId, setAutofillTableId] = useState<string>("all");
  const [selectedDataTableId, setSelectedDataTableId] = useState<string>(
    tables[0]?.id ?? "all",
  );

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setExecutionLog((prev) => [
      { id: createId("log"), type, message, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const clearLog = () => {
    setExecutionLog([]);
    setSessionTables([]);
  };

  // Tables for SQL autocomplete
  const editorTables = useMemo(() => {
    return sessionTables.map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => c.name),
    }));
  }, [sessionTables]);

  // Handle validation changes from SQL editor
  const handleValidationChange = (isValid: boolean, errors: string[]) => {
    setIsQueryValid(isValid);
    setValidationErrors(errors);
  };

  const sqlBundle = useMemo(() => {
    const createStatements = tables.map(buildCreateTableSql);
    const insertStatements = tables.flatMap((table) =>
      buildInsertSql(table, rowsByTable[table.id] ?? []),
    );
    return { createStatements, insertStatements };
  }, [tables, rowsByTable]);

  const derivedQuery = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0) return trimmed;
    const firstTable = tables[0]?.name ?? "";
    return firstTable ? `SELECT * FROM ${firstTable};` : "";
  }, [query, tables]);

  const sqlBundleText = useMemo(() => {
    return [
      ...sqlBundle.createStatements,
      ...sqlBundle.insertStatements,
      derivedQuery,
    ]
      .filter(Boolean)
      .join(";\n\n");
  }, [sqlBundle, derivedQuery]);

  useEffect(() => {
    return () => {
      if (!sessionId) return;
      void api.closeSession(sessionId).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    const saved = localStorage.getItem("seeql:sessionId");
    if (!saved) return;
    setSessionId(saved);
    void api
      .getSessionSchema(saved)
      .then((response) => {
        if (response.schema?.tables) {
          setSessionTables(
            response.schema.tables.map((t) => ({
              name: t.name,
              columns: t.columns.map((c) => ({
                name: c.name,
                type: c.type,
                is_primary: c.is_primary,
                is_foreign: c.is_foreign,
                ref_table: c.ref_table,
                ref_column: c.ref_column,
              })),
            })),
          );
        }
        addLog("info", `Session restored: ${saved.slice(0, 8)}...`);
      })
      .catch(() => {
        setSessionId(null);
        localStorage.removeItem("seeql:sessionId");
      });
  }, [addLog]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("seeql:sessionId", sessionId);
    } else {
      localStorage.removeItem("seeql:sessionId");
    }
  }, [sessionId]);

  const handleCreateSession = async () => {
    setIsSessionLoading(true);
    setError(null);
    clearLog();

    try {
      // Close existing session if any
      if (sessionId) {
        await api.closeSession(sessionId).catch(() => {});
      }

      // Create new session
      const created = await api.createSession();
      setSessionId(created.session_id);
      setResult(null);
      setSessionTables([]);
      setPushedTableIds(new Set());
      setDirtyTableIds(new Set());
      setAutofillTableId("all");
      addLog("info", `Session started: ${created.session_id.slice(0, 8)}...`);
      addLog(
        "info",
        "Ready to run SQL. Use CREATE TABLE, INSERT, SELECT, etc.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setSessionId(null);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    setIsSessionLoading(true);
    setError(null);

    try {
      await api.closeSession(sessionId);
      addLog("info", "Session ended.");
      setSessionId(null);
      setResult(null);
      setSessionTables([]);
      setPushedTableIds(new Set());
      setDirtyTableIds(new Set());
      setAutofillTableId("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleRun = async () => {
    if (!derivedQuery || !sessionId) return;

    setIsRunning(true);
    setError(null);

    // Detect if this is a CREATE TABLE statement
    const isCreateTable = derivedQuery
      .trim()
      .toUpperCase()
      .startsWith("CREATE TABLE");
    const isInsert = derivedQuery.trim().toUpperCase().startsWith("INSERT");

    try {
      const response = await api.executePlayground(
        sessionId,
        derivedQuery.replace(/;+$/, ""),
      );
      setResult(response);

      // Update session tables from schema if returned
      if (response.schema?.tables) {
        setSessionTables(
          response.schema.tables.map((t) => ({
            name: t.name,
            columns: t.columns.map((c) => ({
              name: c.name,
              type: c.type,
              is_primary: c.is_primary,
              is_foreign: c.is_foreign,
              ref_table: c.ref_table,
              ref_column: c.ref_column,
            })),
          })),
        );
      }

      // Log appropriate message
      if (isCreateTable) {
        const tableCount = response.schema?.tables?.length ?? 0;
        addLog(
          "success",
          `Table created successfully! (${tableCount} table${tableCount !== 1 ? "s" : ""} in session)`,
        );
      } else if (isInsert) {
        addLog("success", `Inserted ${response.row_count ?? 0} row(s)`);
      } else {
        addLog(
          "success",
          `Query executed: ${response.row_count ?? 0} rows returned`,
        );
      }
    } catch (err) {
      const errorMsg = sanitizeError(
        err instanceof Error ? err.message : "Failed to run query",
      );
      // Session expired — clear it so the user knows to start a new one
      if (err instanceof ApiError && err.statusCode === 404) {
        setError("Session expired or not found. Please start a new session.");
        setSessionId(null);
        setSessionTables([]);
        setPushedTableIds(new Set());
      } else {
        setError(errorMsg);
      }
      setResult(null);
      addLog("error", `Query failed: ${errorMsg}`);
    } finally {
      setIsRunning(false);
    }
  };

  const updateTable = (
    tableId: string,
    updater: (table: TableDef) => TableDef,
  ) => {
    setTables((prev) =>
      prev.map((table) => (table.id === tableId ? updater(table) : table)),
    );
    // Mark as dirty if it was already pushed so the Save button reappears
    if (pushedTableIds.has(tableId)) {
      setDirtyTableIds((prev) => new Set([...prev, tableId]));
    }
  };

  const syncRowsWithColumns = (table: TableDef) => {
    setRowsByTable((prev) => {
      const rows = prev[table.id] ?? [];
      const columnNames = table.columns.map((col) => col.name);
      const nextRows = rows.map((row) => {
        const nextRow: RowDef = {};
        for (const name of columnNames) {
          nextRow[name] = row[name] ?? "";
        }
        return nextRow;
      });
      return { ...prev, [table.id]: nextRows };
    });
  };

  const addTable = () => {
    const newTable: TableDef = {
      id: createId("t"),
      name: `table_${tables.length + 1}`,
      columns: [
        {
          id: createId("c"),
          name: "id",
          type: "INTEGER",
          nullable: false,
          primary: true,
          unique: true,
          foreignKey: false,
          refTable: "",
          refColumn: "",
        },
        {
          id: createId("c"),
          name: "name",
          type: "TEXT",
          nullable: false,
          primary: false,
          unique: false,
          foreignKey: false,
          refTable: "",
          refColumn: "",
        },
      ],
    };
    setTables((prev) => [...prev, newTable]);
    setRowsByTable((prev) => ({ ...prev, [newTable.id]: [] }));
    setActiveDataTab(newTable.id);
  };

  const removeTable = (tableId: string) => {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
    setRowsByTable((prev) => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
    if (activeDataTab === tableId) {
      setActiveDataTab(tables.find((t) => t.id !== tableId)?.id ?? "");
    }
  };

  const addColumn = (tableId: string) => {
    updateTable(tableId, (table) => {
      const nextColumn: ColumnDef = {
        id: createId("c"),
        name: `column_${table.columns.length + 1}`,
        type: "TEXT",
        nullable: true,
        primary: false,
        unique: false,
        foreignKey: false,
        refTable: "",
        refColumn: "",
      };
      const nextTable = { ...table, columns: [...table.columns, nextColumn] };
      syncRowsWithColumns(nextTable);
      return nextTable;
    });
  };

  const removeColumn = (tableId: string, columnId: string) => {
    updateTable(tableId, (table) => {
      const nextTable = {
        ...table,
        columns: table.columns.filter((column) => column.id !== columnId),
      };
      syncRowsWithColumns(nextTable);
      return nextTable;
    });
  };

  const updateColumn = (
    tableId: string,
    columnId: string,
    updater: (column: ColumnDef) => ColumnDef,
  ) => {
    updateTable(tableId, (table) => {
      const nextColumns = table.columns.map((column) =>
        column.id === columnId ? updater(column) : column,
      );
      const nextTable = { ...table, columns: nextColumns };
      syncRowsWithColumns(nextTable);
      return nextTable;
    });
  };

  const _generateRowsForTable = (
    table: TableDef,
    count: number,
    tableIndex: number,
  ) => {
    const rows: RowDef[] = [];
    for (let i = 0; i < count; i += 1) {
      const row: RowDef = { _rowId: createId("row") };
      for (const column of table.columns) {
        row[column.name] = generateValue(column, i, count, tableIndex);
      }
      rows.push(row);
    }
    return rows;
  };

  const handleGenerateData = async () => {
    const isSessionTarget = autofillTableId.startsWith("session:");
    const builderTables =
      autofillTableId === "all"
        ? tables
        : tables.filter((t) => t.id === autofillTableId);

    const sessionTarget = sessionTables.find(
      (t) => `session:${t.name}` === autofillTableId,
    );

    const targetTables = isSessionTarget
      ? sessionTarget
        ? [sessionTableToTableDef(sessionTarget)]
        : []
      : builderTables;

    if (targetTables.length === 0) return;

    const createSql = targetTables.map(buildCreateTableSql).join(";\n");

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.generate(createSql, rowsPerTable);

      if (response.error) {
        setError(sanitizeError(response.error));
        return;
      }

      if (response.data) {
        const newRowsByTable: Record<string, RowDef[]> = {};

        for (const table of targetTables) {
          const tableData = response.data[table.name];
          if (tableData) {
            newRowsByTable[table.id] = tableData.map((row) => {
              const rowDef: RowDef = { _rowId: createId("row") };
              for (const col of table.columns) {
                const value = row[col.name];
                rowDef[col.name] =
                  value !== null && value !== undefined ? String(value) : "";
              }
              return rowDef;
            });
          } else {
            newRowsByTable[table.id] = [];
          }
        }

        if (isSessionTarget) {
          const targetTable = targetTables[0];
          if (!sessionId) {
            setError("Start a session to auto-fill session tables.");
            return;
          }
          const insertStatements = buildInsertSql(
            targetTable,
            newRowsByTable[targetTable.id] ?? [],
          );
          for (const insertSql of insertStatements) {
            try {
              await api.executePlayground(sessionId, insertSql);
            } catch (err) {
              const msg = sanitizeError(
                err instanceof Error ? err.message : "Insert failed",
              );
              addLog(
                "error",
                `Insert into "${targetTable.name}" failed: ${msg}`,
              );
            }
          }
          if (insertStatements.length > 0) {
            addLog(
              "success",
              `Inserted ${insertStatements.length} row(s) into "${targetTable.name}"`,
            );
          }
          setRowsByTable((prev) => ({ ...prev, ...newRowsByTable }));
        } else {
          setRowsByTable((prev) => ({ ...prev, ...newRowsByTable }));
        }
      }
    } catch (err) {
      setError(
        sanitizeError(
          err instanceof Error ? err.message : "Failed to generate data",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const addRow = (tableId: string) => {
    if (tableId.startsWith("session:")) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setRowsByTable((prev) => {
      const nextRows = [...(prev[tableId] ?? [])];
      const row: RowDef = { _rowId: createId("row") };
      for (const column of table.columns) {
        row[column.name] = "";
      }
      nextRows.push(row);
      return { ...prev, [tableId]: nextRows };
    });
  };

  const updateRowValue = (
    tableId: string,
    rowIndex: number,
    columnName: string,
    value: string,
  ) => {
    if (tableId.startsWith("session:")) return;
    setRowsByTable((prev) => {
      const rows = [...(prev[tableId] ?? [])];
      const row = { ...(rows[rowIndex] ?? {}) };
      row[columnName] = value;
      rows[rowIndex] = row;
      return { ...prev, [tableId]: rows };
    });
  };

  const removeRow = (tableId: string, rowIndex: number) => {
    if (tableId.startsWith("session:")) return;
    setRowsByTable((prev) => {
      const rows = [...(prev[tableId] ?? [])];
      rows.splice(rowIndex, 1);
      return { ...prev, [tableId]: rows };
    });
  };

  const handleCopy = async () => {
    if (!sqlBundleText) return;
    await navigator.clipboard.writeText(sqlBundleText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handlePushToSession = async (tableId?: string) => {
    if (!sessionId) return;

    const tablesToPush = tableId
      ? tables.filter((t) => t.id === tableId)
      : tables.filter(
          (t) => !pushedTableIds.has(t.id) || dirtyTableIds.has(t.id),
        );

    if (tablesToPush.length === 0) return;

    setIsPushing(true);
    setError(null);

    const newPushedIds = new Set(pushedTableIds);

    try {
      for (const table of tablesToPush) {
        if (table.columns.length === 0) {
          addLog("error", `Skipped "${table.name}" — no columns defined`);
          continue;
        }

        // For dirty (already-pushed) tables: drop existing session table first
        const isDirty = dirtyTableIds.has(table.id);
        if (isDirty) {
          try {
            await api.executePlayground(
              sessionId,
              `DROP TABLE IF EXISTS ${quoteIdentifier(table.name)}`,
            );
            // Also update sessionTables to remove the old entry
            setSessionTables((prev) =>
              prev.filter(
                (s) => s.name.toLowerCase() !== table.name.toLowerCase(),
              ),
            );
          } catch (err) {
            const msg = sanitizeError(
              err instanceof Error ? err.message : "Drop failed",
            );
            addLog("error", `Failed to drop "${table.name}": ${msg}`);
            setError(`Failed to drop "${table.name}": ${msg}`);
            if (err instanceof ApiError && err.statusCode === 404) {
              setSessionId(null);
              setSessionTables([]);
              setPushedTableIds(new Set());
              setDirtyTableIds(new Set());
              return;
            }
            continue;
          }
        } else {
          // Reject if a table with this name already exists in the session
          const alreadyInSession = sessionTables.some(
            (s) => s.name.toLowerCase() === table.name.toLowerCase(),
          );
          if (alreadyInSession) {
            addLog(
              "error",
              `Skipped "${table.name}" — a table with that name already exists in this session`,
            );
            continue;
          }
        }

        // 1. CREATE TABLE
        const createSql = buildCreateTableSql(table);
        try {
          const response = await api.executePlayground(sessionId, createSql);
          if (response.schema?.tables) {
            setSessionTables(
              response.schema.tables.map((t) => ({
                name: t.name,
                columns: t.columns.map((c) => ({
                  name: c.name,
                  type: c.type,
                  is_primary: c.is_primary,
                  is_foreign: c.is_foreign,
                  ref_table: c.ref_table,
                  ref_column: c.ref_column,
                })),
              })),
            );
          }
          addLog("success", `Created table "${table.name}"`);
        } catch (err) {
          const msg = sanitizeError(
            err instanceof Error ? err.message : "Failed",
          );
          addLog("error", `Failed to create "${table.name}": ${msg}`);
          setError(`Failed to create "${table.name}": ${msg}`);
          // Session expired
          if (err instanceof ApiError && err.statusCode === 404) {
            setSessionId(null);
            setSessionTables([]);
            setPushedTableIds(new Set());
            return;
          }
          continue; // skip inserts if create failed
        }

        // 2. INSERT rows if any exist
        const rows = rowsByTable[table.id] ?? [];
        if (rows.length > 0) {
          const insertStatements = buildInsertSql(table, rows);
          for (const insertSql of insertStatements) {
            try {
              await api.executePlayground(sessionId, insertSql);
            } catch (err) {
              const msg = sanitizeError(
                err instanceof Error ? err.message : "Insert failed",
              );
              addLog("error", `Insert into "${table.name}" failed: ${msg}`);
            }
          }
          if (insertStatements.length > 0) {
            addLog(
              "success",
              `Inserted ${insertStatements.length} row(s) into "${table.name}"`,
            );
          }
        }

        newPushedIds.add(table.id);
      }

      setPushedTableIds(newPushedIds);
      // Clear dirty flags for tables that were just saved
      setDirtyTableIds((prev) => {
        const next = new Set(prev);
        for (const id of newPushedIds) next.delete(id);
        return next;
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                SeeQL
              </span>
            </Link>
            <Badge variant="secondary" className="font-normal">
              Playground
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {/* Session Controls */}
            <div className="flex items-center gap-2">
              {sessionId ? (
                <>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono bg-green-500/10 text-green-600 border-green-500/30"
                  >
                    Session Active
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndSession}
                    disabled={isSessionLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    {isSessionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-1" />
                    )}
                    End Session
                  </Button>
                </>
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    No Session
                  </Badge>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCreateSession}
                    disabled={isSessionLoading || !isServerOnline}
                  >
                    {isSessionLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Start Session
                  </Button>
                </>
              )}
            </div>
            <ThemeSwitcher />
            <nav className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground"
                asChild
              >
                <Link href="/">Playground</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/quick">Quick Mode</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Schema & Builder */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full overflow-auto">
              {/* Panel Header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border/50">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Schema</span>
                  {sessionTables.length + tables.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {sessionTables.length + tables.length}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={addTable}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Table
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* No session — prompt to start one (shown above draft tables) */}
                {!sessionId && (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                    <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {tables.length > 0
                        ? "Start a session to save these tables and run queries."
                        : "Start a session to create tables and run queries."}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleCreateSession}
                      disabled={isSessionLoading || !isServerOnline}
                    >
                      {isSessionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Start Session
                    </Button>
                  </div>
                )}

                {/* Session tables (read-only, already in DB) */}
                {sessionTables.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1">
                      In Session
                    </p>
                    {sessionTables.map((table) => (
                      <div
                        key={table.name}
                        className="rounded-lg border border-green-500/25 overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border-b border-green-500/15">
                          <Check className="h-3 w-3 text-green-600 shrink-0" />
                          <span className="font-mono font-medium text-sm flex-1 truncate">
                            {table.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {table.columns.length} col
                            {table.columns.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="divide-y divide-border/20">
                          {table.columns.map((col) => (
                            <div
                              key={col.name}
                              className="flex items-center gap-2 text-xs font-mono px-3 py-1"
                            >
                              <span
                                className={cn(
                                  "font-medium truncate",
                                  col.is_primary && "text-amber-600",
                                  col.is_foreign &&
                                    !col.is_primary &&
                                    "text-blue-600",
                                )}
                              >
                                {col.name}
                              </span>
                              <span className="text-muted-foreground/60 ml-auto shrink-0">
                                {col.type}
                              </span>
                              {col.is_primary && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-4 bg-amber-500/10 border-amber-500/30"
                                >
                                  PK
                                </Badge>
                              )}
                              {col.is_foreign && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-4 bg-blue-500/10 border-blue-500/30"
                                >
                                  FK
                                  {col.ref_table
                                    ? ` \u2192 ${col.ref_table}`
                                    : ""}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Draft tables (editable, not yet in session) */}
                {tables.length > 0 && (
                  <div className="space-y-2">
                    {sessionTables.length > 0 && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1">
                        Draft
                      </p>
                    )}
                    <div className="space-y-3">
                      {tables.map((table) => {
                        const isPushed = pushedTableIds.has(table.id);
                        const hasRows =
                          (rowsByTable[table.id] ?? []).length > 0;

                        const builderTargets: RefTarget[] = tables
                          .filter((t) => t.id !== table.id && t.name !== "")
                          .map((t) => ({
                            name: t.name,
                            columns: t.columns
                              .map((c) => c.name)
                              .filter(Boolean),
                          }));
                        const sessionTargets: RefTarget[] = sessionTables
                          .filter(
                            (t) => !tables.some((bt) => bt.name === t.name),
                          )
                          .map((t) => ({
                            name: t.name,
                            columns: t.columns.map((c) => c.name),
                          }));
                        const refTargets: RefTarget[] = [
                          ...sessionTargets,
                          ...builderTargets,
                        ];

                        const nameLower = table.name.toLowerCase();
                        const isDuplicateName =
                          tables.some(
                            (t) =>
                              t.id !== table.id &&
                              t.name.toLowerCase() === nameLower,
                          ) ||
                          sessionTables.some(
                            (t) => t.name.toLowerCase() === nameLower,
                          );

                        return (
                          <div key={table.id}>
                            <TableCard
                              table={table}
                              refTargets={refTargets}
                              isDuplicateName={isDuplicateName}
                              onUpdate={(updater) =>
                                updateTable(table.id, updater)
                              }
                              onRemove={() => removeTable(table.id)}
                              onAddColumn={() => addColumn(table.id)}
                              onUpdateColumn={(colId, updater) =>
                                updateColumn(table.id, colId, updater)
                              }
                              onRemoveColumn={(colId) =>
                                removeColumn(table.id, colId)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Auto-fill */}
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">
                            Auto-fill rows
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Works for draft and session tables
                        </span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Select
                          value={autofillTableId}
                          onValueChange={setAutofillTableId}
                          disabled={
                            isGenerating ||
                            tables.length + sessionTables.length === 0
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Choose table" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.length > 0 && (
                              <>
                                <SelectItem value="all">
                                  All draft tables
                                </SelectItem>
                                {tables.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name || "(unnamed draft)"}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {sessionTables.length > 0 && (
                              <>
                                {sessionTables.map((t) => (
                                  <SelectItem
                                    key={t.name}
                                    value={`session:${t.name}`}
                                  >
                                    {t.name} (session)
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="rows-count"
                            className="text-xs text-muted-foreground"
                          >
                            Rows
                          </Label>
                          <Input
                            id="rows-count"
                            type="number"
                            value={rowsPerTable}
                            onChange={(e) =>
                              setRowsPerTable(
                                Math.max(
                                  1,
                                  Math.min(
                                    20,
                                    Number.parseInt(e.target.value, 10) || 1,
                                  ),
                                ),
                              )
                            }
                            className="w-16 h-8 text-xs text-center"
                            min={1}
                            max={20}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          Generated rows show below. Session tables insert
                          immediately.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleGenerateData}
                          disabled={
                            isGenerating ||
                            (tables.length === 0 && sessionTables.length === 0)
                          }
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Generate rows
                        </Button>
                      </div>
                    </div>

                    {/* Save to Session */}
                    {sessionId &&
                      tables.some(
                        (t) =>
                          (!pushedTableIds.has(t.id) ||
                            dirtyTableIds.has(t.id)) &&
                          t.columns.length > 0,
                      ) && (
                        <div className="pt-2">
                          <Button
                            className="w-full"
                            onClick={() => handlePushToSession()}
                            disabled={isPushing || !sessionId}
                          >
                            {isPushing ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1.5" />
                            )}
                            Save to Session
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Empty state */}
                {tables.length === 0 &&
                  sessionTables.length === 0 &&
                  sessionId && (
                    <div className="rounded-lg border border-dashed border-border/60 py-10 text-center">
                      <TableIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground mb-3">
                        No tables yet
                      </p>
                      <Button variant="outline" size="sm" onClick={addTable}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add your first table
                      </Button>
                    </div>
                  )}

                {/* Execution Log */}
                {executionLog.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1">
                      Log
                    </p>
                    <div className="rounded-lg border border-border/50 p-2 max-h-36 overflow-auto">
                      <div className="space-y-1 font-mono text-[11px]">
                        {executionLog.map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex items-start gap-2 px-2 py-0.5 rounded",
                              entry.type === "success" && "text-green-700",
                              entry.type === "error" && "text-red-700",
                              entry.type === "info" && "text-muted-foreground",
                            )}
                          >
                            <span className="text-muted-foreground/50 shrink-0">
                              {entry.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>{entry.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Preview */}
                {(() => {
                  const isSession = selectedDataTableId.startsWith("session:");
                  const selectedSession = sessionTables.find(
                    (t) => `session:${t.name}` === selectedDataTableId,
                  );
                  const selectedDraft = tables.find(
                    (t) => t.id === selectedDataTableId,
                  );
                  const selectedTable = isSession
                    ? selectedSession
                      ? sessionTableToTableDef(selectedSession)
                      : null
                    : (selectedDraft ?? tables[0] ?? null);

                  const dataTargetId = selectedTable?.id ?? null;
                  const rows = dataTargetId
                    ? (rowsByTable[dataTargetId] ?? [])
                    : [];

                  const showSkeleton =
                    isGenerating && selectedTable && rows.length === 0;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1">
                          Data
                        </p>
                        <Select
                          value={selectedDataTableId}
                          onValueChange={setSelectedDataTableId}
                          disabled={
                            isGenerating ||
                            tables.length + sessionTables.length === 0
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-44">
                            <SelectValue placeholder="Pick table" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.length > 0 && (
                              <>
                                {tables.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name || "(unnamed draft)"}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {sessionTables.length > 0 && (
                              <>
                                {sessionTables.map((t) => (
                                  <SelectItem
                                    key={t.name}
                                    value={`session:${t.name}`}
                                  >
                                    {t.name} (session)
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {showSkeleton && (
                        <div className="rounded-md border border-border/50 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/30">
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Generating{" "}
                              <span className="font-medium text-foreground">
                                {selectedTable?.name || "table"}
                              </span>
                              …
                            </span>
                          </div>
                          <div className="p-2 space-y-1.5">
                            {Array.from({
                              length: Math.min(rowsPerTable, 4),
                            }).map((_, i) => (
                              <Skeleton
                                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
                                key={i}
                                className="h-6 w-full rounded"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedTable && rows.length > 0 && (
                        <DataPreviewTable
                          table={selectedTable}
                          rows={rows}
                          onUpdateRow={(rowIndex, colName, value) =>
                            updateRowValue(
                              selectedTable.id,
                              rowIndex,
                              colName,
                              value,
                            )
                          }
                          onRemoveRow={(rowIndex) =>
                            removeRow(selectedTable.id, rowIndex)
                          }
                          onAddRow={() => addRow(selectedTable.id)}
                          readOnly={isSession}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Query & Results */}
          <ResizablePanel defaultSize={50} minSize={40}>
            <div className="h-full flex flex-col">
              {/* Query Section */}
              <div className="p-6 border-b border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    SQL Query
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {isCopied ? (
                        <Check className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1.5" />
                      )}
                      {isCopied ? "Copied" : "Copy All"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRun}
                      disabled={isRunning || !sessionId || !isQueryValid}
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      {isRunning ? "Running..." : "Run Query"}
                    </Button>
                  </div>
                </div>
                <SQLEditor
                  value={query}
                  onChange={setQuery}
                  onSubmit={handleRun}
                  onValidationChange={handleValidationChange}
                  placeholder="CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);"
                  disabled={!sessionId}
                  tables={editorTables}
                  autoFocus
                />
                {!sessionId ? (
                  <p className="text-xs text-amber-600">
                    Start a session to run queries.
                  </p>
                ) : !isQueryValid && validationErrors.length > 0 ? (
                  <p className="text-xs text-red-600">{validationErrors[0]}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Session active. Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">
                      Cmd+Enter
                    </kbd>{" "}
                    to run.
                  </p>
                )}
              </div>

              {/* Results Section */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Results</h2>
                  {result?.row_count !== undefined && (
                    <Badge variant="outline">{result.row_count} rows</Badge>
                  )}
                </div>
                {error && (
                  <div className="mb-4 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <ResultsTable result={result} />
              </div>

              {/* SQL Preview (Collapsible) */}
              <details className="border-t border-border/40">
                <summary className="px-6 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  View Generated SQL
                </summary>
                <div className="px-6 pb-4">
                  <pre className="p-4 rounded-lg bg-muted/50 text-xs overflow-auto max-h-48 font-mono">
                    {sqlBundleText}
                  </pre>
                </div>
              </details>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
