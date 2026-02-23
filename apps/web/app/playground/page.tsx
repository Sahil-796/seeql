"use client";

import {
  Check,
  ChevronDown,
  Code,
  Copy,
  Database,
  Hammer,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SQLEditor } from "@/components/SQLEditor";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { api } from "@/lib/api";
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
};

type TableDef = {
  id: string;
  name: string;
  columns: ColumnDef[];
};

type RowDef = Record<string, string>;

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

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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
  const columns = table.columns.map((col) => {
    const parts = [`${quoteIdentifier(col.name)} ${col.type}`];
    if (col.primary) parts.push("PRIMARY KEY");
    if (!col.nullable) parts.push("NOT NULL");
    if (col.unique && !col.primary) parts.push("UNIQUE");
    return parts.join(" ");
  });

  return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(table.name)} (\n  ${columns.join(",\n  ")}\n)`;
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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Components
function ColumnRow({
  column,
  onUpdate,
  onRemove,
}: {
  column: ColumnDef;
  onUpdate: (updater: (col: ColumnDef) => ColumnDef) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Input
        value={column.name}
        onChange={(e) =>
          onUpdate((prev) => ({ ...prev, name: toIdentifier(e.target.value) }))
        }
        className="flex-1 h-8 text-sm"
        placeholder="Column name"
      />
      <Select
        value={column.type}
        onValueChange={(value) =>
          onUpdate((prev) => ({ ...prev, type: value as ColumnType }))
        }
      >
        <SelectTrigger className="w-32 h-8" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COLUMN_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`${column.id}-notnull`}
            checked={!column.nullable}
            onCheckedChange={(checked) =>
              onUpdate((prev) => ({ ...prev, nullable: !checked }))
            }
          />
          <Label
            htmlFor={`${column.id}-notnull`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            NOT NULL
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`${column.id}-pk`}
            checked={column.primary}
            onCheckedChange={(checked) =>
              onUpdate((prev) => ({
                ...prev,
                primary: !!checked,
                unique: checked ? true : prev.unique,
              }))
            }
          />
          <Label
            htmlFor={`${column.id}-pk`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            PK
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`${column.id}-unique`}
            checked={column.unique}
            onCheckedChange={(checked) =>
              onUpdate((prev) => ({ ...prev, unique: !!checked }))
            }
          />
          <Label
            htmlFor={`${column.id}-unique`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            UNIQUE
          </Label>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TableCard({
  table,
  onUpdate,
  onRemove,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  isCreated,
}: {
  table: TableDef;
  onUpdate: (updater: (t: TableDef) => TableDef) => void;
  onRemove: () => void;
  onAddColumn: () => void;
  onUpdateColumn: (
    columnId: string,
    updater: (col: ColumnDef) => ColumnDef,
  ) => void;
  onRemoveColumn: (columnId: string) => void;
  isCreated?: boolean;
}) {
  return (
    <Card
      className={cn("overflow-hidden", isCreated && "ring-2 ring-green-500/30")}
    >
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                isCreated ? "bg-green-500/10" : "bg-primary/10",
              )}
            >
              {isCreated ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <TableIcon className="h-4 w-4 text-primary" />
              )}
            </div>
            <Input
              value={table.name}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  name: toIdentifier(e.target.value),
                }))
              }
              className="w-48 h-8 font-medium"
              disabled={isCreated}
            />
            <Badge variant="secondary" className="text-xs">
              {table.columns.length} columns
            </Badge>
            {isCreated && (
              <Badge
                variant="outline"
                className="text-xs bg-green-500/10 text-green-600 border-green-500/30"
              >
                In Session
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddColumn}
              disabled={isCreated}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Column
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              disabled={isCreated}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {table.columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            onUpdate={(updater) => onUpdateColumn(column.id, updater)}
            onRemove={() => onRemoveColumn(column.id)}
          />
        ))}
        {table.columns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No columns yet. Add a column to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DataPreviewTable({
  table,
  rows,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
}: {
  table: TableDef;
  rows: RowDef[];
  onUpdateRow: (rowIndex: number, columnName: string, value: string) => void;
  onRemoveRow: (rowIndex: number) => void;
  onAddRow: () => void;
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
        <Button variant="outline" size="sm" onClick={onAddRow}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Row
        </Button>
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
              const rowKey = `${table.id}-${JSON.stringify(row)}`;
              return (
                <TableRow key={rowKey}>
                  {table.columns.map((col) => (
                    <TableCell key={col.id} className="p-1.5">
                      <Input
                        value={row[col.name] ?? ""}
                        onChange={(e) =>
                          onUpdateRow(rowIndex, col.name, e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveRow(rowIndex)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
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
          {result.rows.map((row) => {
            const rowKey = JSON.stringify(row);
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
  const [leftPanelTab, setLeftPanelTab] = useState<"schema" | "builder">(
    "schema",
  );
  const [isPushing, setIsPushing] = useState(false);
  const [pushedTableIds, setPushedTableIds] = useState<Set<string>>(new Set());

  const addLog = (type: LogEntry["type"], message: string) => {
    setExecutionLog((prev) => [
      ...prev,
      { id: createId("log"), type, message, timestamp: new Date() },
    ]);
  };

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
        derivedQuery.replace(/;$/, ""),
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
      const errorMsg =
        err instanceof Error ? err.message : "Failed to run query";
      setError(errorMsg);
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
        },
        {
          id: createId("c"),
          name: "name",
          type: "TEXT",
          nullable: false,
          primary: false,
          unique: false,
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

  const generateRowsForTable = (
    table: TableDef,
    count: number,
    tableIndex: number,
  ) => {
    const rows: RowDef[] = [];
    for (let i = 0; i < count; i += 1) {
      const row: RowDef = {};
      for (const column of table.columns) {
        row[column.name] = generateValue(column, i, count, tableIndex);
      }
      rows.push(row);
    }
    return rows;
  };

  const handleGenerateData = async () => {
    // Build CREATE TABLE statements from current schema
    const createSql = tables.map(buildCreateTableSql).join(";\n");

    if (!createSql) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.generate(createSql, rowsPerTable);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        // Map API response to our rowsByTable format
        const newRowsByTable: Record<string, RowDef[]> = {};

        for (const table of tables) {
          const tableData = response.data[table.name];
          if (tableData) {
            newRowsByTable[table.id] = tableData.map((row) => {
              const rowDef: RowDef = {};
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

        setRowsByTable(newRowsByTable);
      }
    } catch (err) {
      // Fallback to local generation if API fails
      console.warn("API generation failed, using local fallback:", err);
      setRowsByTable((prev) => {
        const next: Record<string, RowDef[]> = { ...prev };
        tables.forEach((table, index) => {
          next[table.id] = generateRowsForTable(table, rowsPerTable, index);
        });
        return next;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addRow = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setRowsByTable((prev) => {
      const nextRows = [...(prev[tableId] ?? [])];
      const row: RowDef = {};
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
    setRowsByTable((prev) => {
      const rows = [...(prev[tableId] ?? [])];
      const row = { ...(rows[rowIndex] ?? {}) };
      row[columnName] = value;
      rows[rowIndex] = row;
      return { ...prev, [tableId]: rows };
    });
  };

  const removeRow = (tableId: string, rowIndex: number) => {
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
      : tables.filter((t) => !pushedTableIds.has(t.id));

    if (tablesToPush.length === 0) return;

    setIsPushing(true);
    setError(null);

    const newPushedIds = new Set(pushedTableIds);

    for (const table of tablesToPush) {
      if (table.columns.length === 0) {
        addLog("error", `Skipped "${table.name}" — no columns defined`);
        continue;
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
        const msg = err instanceof Error ? err.message : "Failed";
        addLog("error", `Failed to create "${table.name}": ${msg}`);
        setError(msg);
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
            const msg = err instanceof Error ? err.message : "Insert failed";
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
    setIsPushing(false);
    setLeftPanelTab("schema");
  };

  const handlePushSingleTable = async (tableId: string) => {
    await handlePushToSession(tableId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
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
                    disabled={isSessionLoading}
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
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">Quick Mode</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground"
                asChild
              >
                <Link href="/playground">Playground</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Schema & Builder */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full overflow-auto">
              {/* Tab Switcher */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setLeftPanelTab("schema")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                      leftPanelTab === "schema"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Database className="h-4 w-4" />
                    Session Schema
                    {sessionTables.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {sessionTables.length}
                      </Badge>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftPanelTab("builder")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                      leftPanelTab === "builder"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Hammer className="h-4 w-4" />
                    Schema Builder
                    {tables.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {tables.length}
                      </Badge>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6 space-y-6">
                {leftPanelTab === "schema" ? (
                  <>
                    {/* Session Tables Section */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-muted-foreground">
                          {sessionId
                            ? "Tables in this session"
                            : "Start a session to create tables"}
                        </p>
                      </div>

                      {!sessionId ? (
                        <Card className="border-dashed">
                          <CardContent className="p-6 text-center">
                            <Database className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mb-4">
                              No active session. Start a session to create
                              tables and run queries.
                            </p>
                            <Button
                              onClick={handleCreateSession}
                              disabled={isSessionLoading}
                            >
                              {isSessionLoading ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-1.5" />
                              )}
                              Start Session
                            </Button>
                          </CardContent>
                        </Card>
                      ) : isSessionLoading ? (
                        <div className="space-y-3">
                          <Card className="overflow-hidden">
                            <CardHeader className="pb-2 bg-muted/30">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-7 w-7 rounded-md" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-12 ml-auto rounded-full" />
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-1.5">
                              <Skeleton className="h-6 w-full rounded" />
                              <Skeleton className="h-6 w-full rounded" />
                              <Skeleton className="h-6 w-3/4 rounded" />
                            </CardContent>
                          </Card>
                        </div>
                      ) : sessionTables.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-6 text-center">
                            <TableIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mb-3">
                              No tables yet.
                            </p>
                            <div className="flex flex-col gap-2 items-center">
                              <p className="text-xs text-muted-foreground font-mono mb-2">
                                Run a CREATE TABLE statement, or use the Schema
                                Builder.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLeftPanelTab("builder")}
                              >
                                <Hammer className="h-4 w-4 mr-1.5" />
                                Open Schema Builder
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {sessionTables.map((table) => (
                            <Card key={table.name} className="overflow-hidden">
                              <CardHeader className="pb-2 bg-green-500/5 border-b border-green-500/20">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 rounded-md bg-green-500/10">
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </div>
                                  <span className="font-medium font-mono text-sm">
                                    {table.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs ml-auto"
                                  >
                                    {table.columns.length} col
                                    {table.columns.length !== 1 ? "s" : ""}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3">
                                <div className="space-y-1">
                                  {table.columns.map((col) => (
                                    <div
                                      key={col.name}
                                      className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded bg-muted/50"
                                    >
                                      <span
                                        className={cn(
                                          "font-medium",
                                          col.is_primary && "text-amber-600",
                                          col.is_foreign &&
                                            !col.is_primary &&
                                            "text-blue-600",
                                        )}
                                      >
                                        {col.name}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {col.type}
                                      </span>
                                      <div className="flex gap-1 ml-auto">
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
                                            title={
                                              col.ref_table && col.ref_column
                                                ? `References ${col.ref_table}.${col.ref_column}`
                                                : "Foreign Key"
                                            }
                                          >
                                            FK
                                            {col.ref_table
                                              ? ` → ${col.ref_table}`
                                              : ""}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Execution Log Section */}
                    {executionLog.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Execution Log
                          </h2>
                          <Button variant="ghost" size="sm" onClick={clearLog}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                        <Card>
                          <CardContent className="p-3 max-h-48 overflow-auto">
                            <div className="space-y-1.5 font-mono text-xs">
                              {executionLog.map((entry) => (
                                <div
                                  key={entry.id}
                                  className={cn(
                                    "flex items-start gap-2 px-2 py-1 rounded",
                                    entry.type === "success" &&
                                      "bg-green-500/10 text-green-700",
                                    entry.type === "error" &&
                                      "bg-red-500/10 text-red-700",
                                    entry.type === "info" &&
                                      "bg-blue-500/10 text-blue-700",
                                  )}
                                >
                                  <span className="text-muted-foreground shrink-0">
                                    {entry.timestamp.toLocaleTimeString()}
                                  </span>
                                  <span>{entry.message}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </section>
                    )}
                  </>
                ) : (
                  <>
                    {/* Schema Builder */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Design tables visually and push them to your
                            session.
                          </p>
                        </div>
                      </div>

                      {/* Builder Action Bar */}
                      <div className="flex items-center gap-2 mb-4">
                        <Button variant="outline" size="sm" onClick={addTable}>
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Table
                        </Button>
                        {tables.length > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateData}
                              disabled={isGenerating || tables.length === 0}
                            >
                              {isGenerating ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Auto-fill Data
                            </Button>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <Label
                                htmlFor="rows-count"
                                className="text-xs text-muted-foreground"
                              >
                                Rows:
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
                                        Number.parseInt(e.target.value, 10) ||
                                          1,
                                      ),
                                    ),
                                  )
                                }
                                className="w-14 h-7 text-xs"
                                min={1}
                                max={20}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Table Cards */}
                      {tables.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-6 text-center">
                            <TableIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mb-3">
                              No tables defined yet.
                            </p>
                            <Button variant="outline" onClick={addTable}>
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add Your First Table
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {tables.map((table) => {
                            const isPushed = pushedTableIds.has(table.id);
                            const hasRows =
                              (rowsByTable[table.id] ?? []).length > 0;

                            return (
                              <div key={table.id} className="space-y-2">
                                <TableCard
                                  table={table}
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
                                  isCreated={isPushed}
                                />

                                {/* Data Preview */}
                                {hasRows && !isPushed && (
                                  <div className="ml-2">
                                    <DataPreviewTable
                                      table={table}
                                      rows={rowsByTable[table.id] ?? []}
                                      onUpdateRow={(rowIndex, colName, value) =>
                                        updateRowValue(
                                          table.id,
                                          rowIndex,
                                          colName,
                                          value,
                                        )
                                      }
                                      onRemoveRow={(rowIndex) =>
                                        removeRow(table.id, rowIndex)
                                      }
                                      onAddRow={() => addRow(table.id)}
                                    />
                                  </div>
                                )}

                                {/* Push single table button */}
                                {!isPushed &&
                                  sessionId &&
                                  table.columns.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full border-dashed text-muted-foreground hover:text-foreground"
                                      onClick={() =>
                                        handlePushSingleTable(table.id)
                                      }
                                      disabled={isPushing}
                                    >
                                      {isPushing ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      {hasRows
                                        ? `Create "${table.name}" with ${(rowsByTable[table.id] ?? []).length} rows`
                                        : `Create "${table.name}" in Session`}
                                    </Button>
                                  )}

                                {isPushed && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-700 text-xs">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Pushed to session</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Push All to Session */}
                      {tables.length > 0 &&
                        sessionId &&
                        tables.some(
                          (t) =>
                            !pushedTableIds.has(t.id) && t.columns.length > 0,
                        ) && (
                          <div className="mt-6 pt-4 border-t">
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
                              Push All Tables to Session
                            </Button>
                            <p className="text-[11px] text-muted-foreground mt-2 text-center">
                              Creates tables
                              {tables.some(
                                (t) => (rowsByTable[t.id] ?? []).length > 0,
                              )
                                ? " and inserts data"
                                : ""}{" "}
                              in your active session
                            </p>
                          </div>
                        )}

                      {/* No session warning */}
                      {tables.length > 0 && !sessionId && (
                        <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs">
                          Start a session first to push tables.
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={handleCreateSession}
                            disabled={isSessionLoading}
                          >
                            {isSessionLoading ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-1.5" />
                            )}
                            Start Session
                          </Button>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Query & Results */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="h-full flex flex-col">
              {/* Query Section */}
              <div className="p-6 border-b space-y-4">
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
              <details className="border-t">
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
