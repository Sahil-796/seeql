"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Play,
  Copy,
  Check,
  Sparkles,
  Table as TableIcon,
  Database,
  Code,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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

// Default tables
const DEFAULT_TABLES: TableDef[] = [
  {
    id: "t-users",
    name: "users",
    columns: [
      { id: "c-users-id", name: "id", type: "INTEGER", nullable: false, primary: true, unique: true },
      { id: "c-users-name", name: "name", type: "TEXT", nullable: false, primary: false, unique: false },
      { id: "c-users-email", name: "email", type: "EMAIL", nullable: false, primary: false, unique: true },
    ],
  },
  {
    id: "t-orders",
    name: "orders",
    columns: [
      { id: "c-orders-id", name: "id", type: "INTEGER", nullable: false, primary: true, unique: true },
      { id: "c-orders-user-id", name: "user_id", type: "INTEGER", nullable: false, primary: false, unique: false },
      { id: "c-orders-total", name: "total", type: "FLOAT", nullable: false, primary: false, unique: false },
    ],
  },
];

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

function generateValue(column: ColumnDef, rowIndex: number, totalRows: number, tableIndex: number) {
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
  if (name.includes("status")) return ["new", "active", "archived"][rowIndex % 3];

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
        onChange={(e) => onUpdate((prev) => ({ ...prev, name: toIdentifier(e.target.value) }))}
        className="flex-1 h-8 text-sm"
        placeholder="Column name"
      />
      <Select
        value={column.type}
        onValueChange={(value) => onUpdate((prev) => ({ ...prev, type: value as ColumnType }))}
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
            onCheckedChange={(checked) => onUpdate((prev) => ({ ...prev, nullable: !checked }))}
          />
          <Label htmlFor={`${column.id}-notnull`} className="text-xs text-muted-foreground cursor-pointer">
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
          <Label htmlFor={`${column.id}-pk`} className="text-xs text-muted-foreground cursor-pointer">
            PK
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`${column.id}-unique`}
            checked={column.unique}
            onCheckedChange={(checked) => onUpdate((prev) => ({ ...prev, unique: !!checked }))}
          />
          <Label htmlFor={`${column.id}-unique`} className="text-xs text-muted-foreground cursor-pointer">
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
}: {
  table: TableDef;
  onUpdate: (updater: (t: TableDef) => TableDef) => void;
  onRemove: () => void;
  onAddColumn: () => void;
  onUpdateColumn: (columnId: string, updater: (col: ColumnDef) => ColumnDef) => void;
  onRemoveColumn: (columnId: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TableIcon className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={table.name}
              onChange={(e) => onUpdate((prev) => ({ ...prev, name: toIdentifier(e.target.value) }))}
              className="w-48 h-8 font-medium"
            />
            <Badge variant="secondary" className="text-xs">
              {table.columns.length} columns
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddColumn}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Column
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
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
                <TableCell colSpan={table.columns.length + 1} className="text-center py-6 text-muted-foreground text-sm">
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
                        onChange={(e) => onUpdateRow(rowIndex, col.name, e.target.value)}
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
              <TableHead key={col} className="text-xs font-medium whitespace-nowrap">
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

// Main Component
export default function PlaygroundPage() {
  const [tables, setTables] = useState<TableDef[]>(DEFAULT_TABLES);
  const [rowsByTable, setRowsByTable] = useState<Record<string, RowDef[]>>({
    "t-users": [
      { id: "1", name: "Jade Fisher", email: "jade@seeql.dev" },
      { id: "2", name: "Rowan Park", email: "rowan@seeql.dev" },
    ],
    "t-orders": [
      { id: "1", user_id: "1", total: "249.50" },
      { id: "2", user_id: "2", total: "540.00" },
    ],
  });
  const [rowsPerTable, setRowsPerTable] = useState(5);
  const [query, setQuery] = useState("SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeDataTab, setActiveDataTab] = useState<string>(tables[0]?.id ?? "");

  const sqlBundle = useMemo(() => {
    const createStatements = tables.map(buildCreateTableSql);
    const insertStatements = tables.flatMap((table) => buildInsertSql(table, rowsByTable[table.id] ?? []));
    return { createStatements, insertStatements };
  }, [tables, rowsByTable]);

  const derivedQuery = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0) return trimmed;
    const firstTable = tables[0]?.name ?? "";
    return firstTable ? `SELECT * FROM ${firstTable};` : "";
  }, [query, tables]);

  const sqlBundleText = useMemo(() => {
    return [...sqlBundle.createStatements, ...sqlBundle.insertStatements, derivedQuery]
      .filter(Boolean)
      .join(";\n\n");
  }, [sqlBundle, derivedQuery]);

  useEffect(() => {
    return () => {
      if (!sessionId) return;
      void api.closeSession(sessionId).catch(() => {});
    };
  }, [sessionId]);

  const handleRun = async () => {
    if (!derivedQuery) return;

    const statements = [...sqlBundle.createStatements, ...sqlBundle.insertStatements, derivedQuery.replace(/;$/, "")].filter(
      Boolean
    );

    setIsRunning(true);
    setError(null);

    try {
      if (sessionId) {
        await api.closeSession(sessionId).catch(() => {});
      }

      const created = await api.createSession();
      setSessionId(created.session_id);

      let lastResult: QueryResult | null = null;
      for (const statement of statements) {
        const response = await api.executePlayground(created.session_id, statement);
        lastResult = response;
      }

      setResult(lastResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run query");
    } finally {
      setIsRunning(false);
    }
  };

  const updateTable = (tableId: string, updater: (table: TableDef) => TableDef) => {
    setTables((prev) => prev.map((table) => (table.id === tableId ? updater(table) : table)));
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
        { id: createId("c"), name: "id", type: "INTEGER", nullable: false, primary: true, unique: true },
        { id: createId("c"), name: "name", type: "TEXT", nullable: false, primary: false, unique: false },
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

  const updateColumn = (tableId: string, columnId: string, updater: (column: ColumnDef) => ColumnDef) => {
    updateTable(tableId, (table) => {
      const nextColumns = table.columns.map((column) => (column.id === columnId ? updater(column) : column));
      const nextTable = { ...table, columns: nextColumns };
      syncRowsWithColumns(nextTable);
      return nextTable;
    });
  };

  const generateRowsForTable = (table: TableDef, count: number, tableIndex: number) => {
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
                rowDef[col.name] = value !== null && value !== undefined ? String(value) : "";
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

  const updateRowValue = (tableId: string, rowIndex: number, columnName: string, value: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">SeeQL</span>
            </Link>
            <Badge variant="secondary" className="font-normal">Playground</Badge>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">Quick Mode</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground" asChild>
                <Link href="/playground">Playground</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Schema & Data */}
          <ResizablePanel defaultSize={55} minSize={35}>
            <div className="h-full overflow-auto p-6 space-y-6">
              {/* Schema Builder Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Schema Builder
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Define your tables and columns
                    </p>
                  </div>
                  <Button onClick={addTable} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Table
                  </Button>
                </div>
                <div className="space-y-4">
                  {tables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onUpdate={(updater) => updateTable(table.id, updater)}
                      onRemove={() => removeTable(table.id)}
                      onAddColumn={() => addColumn(table.id)}
                      onUpdateColumn={(columnId, updater) => updateColumn(table.id, columnId, updater)}
                      onRemoveColumn={(columnId) => removeColumn(table.id, columnId)}
                    />
                  ))}
                </div>
              </section>

              {/* Seed Data Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <TableIcon className="h-5 w-5" />
                      Seed Data
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Generate or manually enter test data
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Rows</Label>
                      <Input
                        type="number"
                        min={1}
                        max={25}
                        value={rowsPerTable}
                        onChange={(e) => setRowsPerTable(Math.min(25, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-16 h-8"
                      />
                    </div>
                    <Button onClick={handleGenerateData} size="sm" disabled={isGenerating}>
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1.5" />
                      )}
                      {isGenerating ? "Generating..." : "Auto-fill All"}
                    </Button>
                  </div>
                </div>
                {tables.length > 0 && (
                  <Tabs value={activeDataTab} onValueChange={setActiveDataTab}>
                    <TabsList className="mb-4">
                      {tables.map((table) => (
                        <TabsTrigger key={table.id} value={table.id} className="gap-1.5">
                          {table.name}
                          <Badge variant="outline" className="ml-1 text-[10px] px-1.5">
                            {rowsByTable[table.id]?.length ?? 0}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {tables.map((table) => (
                      <TabsContent key={table.id} value={table.id}>
                        <DataPreviewTable
                          table={table}
                          rows={rowsByTable[table.id] ?? []}
                          onUpdateRow={(rowIndex, colName, value) => updateRowValue(table.id, rowIndex, colName, value)}
                          onRemoveRow={(rowIndex) => removeRow(table.id, rowIndex)}
                          onAddRow={() => addRow(table.id)}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </section>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Query & Results */}
          <ResizablePanel defaultSize={45} minSize={30}>
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
                      {isCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                      {isCopied ? "Copied" : "Copy All"}
                    </Button>
                    <Button size="sm" onClick={handleRun} disabled={isRunning}>
                      <Play className="h-4 w-4 mr-1.5" />
                      {isRunning ? "Running..." : "Run Query"}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="SELECT * FROM users;"
                    className="w-full h-32 p-4 rounded-lg border bg-muted/30 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your query runs after the auto-generated CREATE TABLE and INSERT statements.
                </p>
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
