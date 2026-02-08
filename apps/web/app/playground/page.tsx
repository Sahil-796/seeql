"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const DEFAULT_TABLES: TableDef[] = [
  {
    id: "t-users",
    name: "users",
    columns: [
      {
        id: "c-users-id",
        name: "id",
        type: "INTEGER",
        nullable: false,
        primary: true,
        unique: true,
      },
      {
        id: "c-users-name",
        name: "name",
        type: "TEXT",
        nullable: false,
        primary: false,
        unique: false,
      },
      {
        id: "c-users-email",
        name: "email",
        type: "EMAIL",
        nullable: false,
        primary: false,
        unique: true,
      },
    ],
  },
  {
    id: "t-orders",
    name: "orders",
    columns: [
      {
        id: "c-orders-id",
        name: "id",
        type: "INTEGER",
        nullable: false,
        primary: true,
        unique: true,
      },
      {
        id: "c-orders-user-id",
        name: "user_id",
        type: "INTEGER",
        nullable: false,
        primary: false,
        unique: false,
      },
      {
        id: "c-orders-total",
        name: "total",
        type: "FLOAT",
        nullable: false,
        primary: false,
        unique: false,
      },
    ],
  },
];

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
  const [query, setQuery] = useState(
    "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;",
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isBundleCopied, setIsBundleCopied] = useState(false);
  const pathname = usePathname();

  const sqlBundle = useMemo(() => {
    const createStatements = tables.map(buildCreateTableSql);
    const insertStatements = tables.flatMap((table) =>
      buildInsertSql(table, rowsByTable[table.id] ?? []),
    );
    return {
      createStatements,
      insertStatements,
    };
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

  const handleRun = async () => {
    if (!derivedQuery) return;

    const statements = [
      ...sqlBundle.createStatements,
      ...sqlBundle.insertStatements,
      derivedQuery.replace(/;$/, ""),
    ].filter(Boolean);

    const fullSql = `${statements.join(";\n")};`;

    setIsRunning(true);
    setError(null);

    try {
      const response = await api.execute(fullSql);
      setResult(response);
      if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run query");
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
        columnNames.forEach((name) => {
          nextRow[name] = row[name] ?? "";
        });
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
  };

  const removeTable = (tableId: string) => {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
    setRowsByTable((prev) => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
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
      table.columns.forEach((column) => {
        row[column.name] = generateValue(column, i, count, tableIndex);
      });
      rows.push(row);
    }
    return rows;
  };

  const handleGenerateData = () => {
    setRowsByTable((prev) => {
      const next: Record<string, RowDef[]> = { ...prev };
      tables.forEach((table, index) => {
        next[table.id] = generateRowsForTable(table, rowsPerTable, index);
      });
      return next;
    });
  };

  const addRow = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    setRowsByTable((prev) => {
      const nextRows = [...(prev[tableId] ?? [])];
      const row: RowDef = {};
      table.columns.forEach((column) => {
        row[column.name] = "";
      });
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

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ccc] font-mono">
      <header className="bg-[#1a1a1a] border-b-2 border-[#39ff14] px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-[#e5e5e5] text-lg font-semibold tracking-[0.2em]">
              SEEQL
            </span>
            <span className="text-[#39ff14] text-xs uppercase tracking-[0.3em]">
              SQL Playground
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.2em]">
            <Link
              href="/"
              className={
                pathname === "/"
                  ? "text-[#39ff14]"
                  : "text-[#666] hover:text-[#e5e5e5]"
              }
            >
              Quick Mode
            </Link>
            <Link
              href="/playground"
              className={
                pathname === "/playground"
                  ? "text-[#39ff14]"
                  : "text-[#666] hover:text-[#e5e5e5]"
              }
            >
              Playground
            </Link>
          </nav>
        </div>
      </header>

      <main className="grid w-full gap-6 px-6 py-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-6 min-w-0">
          <div className="border border-[#333] bg-[#111] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[#39ff14] text-sm mb-1">
                  ▓▓▓ TABLE BUILDER ▓▓▓
                </h2>
                <p className="text-sm text-[#666]">
                  Shape your schema with custom columns, constraints, and names.
                </p>
              </div>
              <button
                type="button"
                onClick={addTable}
                className="px-3 py-1 text-xs border border-[#333] text-[#999] hover:text-[#e5e5e5] transition-colors"
              >
                ADD TABLE
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="border border-[#2a2a2a] bg-[#0f0f10] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#666]">
                        Table
                      </span>
                      <input
                        className="border border-[#333] bg-transparent px-3 py-2 text-sm text-[#e5e5e5]"
                        value={table.name}
                        onChange={(event) =>
                          updateTable(table.id, (prev) => ({
                            ...prev,
                            name: toIdentifier(event.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addColumn(table.id)}
                        className="px-3 py-1 text-xs border border-[#333] text-[#999] hover:text-[#e5e5e5] transition-colors"
                      >
                        ADD COLUMN
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTable(table.id)}
                        className="px-3 py-1 text-xs border border-[#333] text-[#ff6b6b] hover:text-[#ff6b6b] transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {table.columns.map((column) => (
                      <div
                        key={column.id}
                        className="grid gap-3 border border-[#2a2a2a] bg-[#111] p-3 md:grid-cols-[1.2fr_1fr_auto_auto_auto_auto]"
                      >
                        <input
                          className="border border-[#333] bg-[#0d0d0d] px-3 py-2 text-sm text-[#e5e5e5]"
                          value={column.name}
                          onChange={(event) =>
                            updateColumn(table.id, column.id, (prev) => ({
                              ...prev,
                              name: toIdentifier(event.target.value),
                            }))
                          }
                        />
                        <select
                          className="border border-[#333] bg-[#0d0d0d] px-3 py-2 text-sm text-[#e5e5e5]"
                          value={column.type}
                          onChange={(event) =>
                            updateColumn(table.id, column.id, (prev) => ({
                              ...prev,
                              type: event.target.value as ColumnType,
                            }))
                          }
                        >
                          {COLUMN_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#666]">
                          <input
                            type="checkbox"
                            checked={!column.nullable}
                            onChange={(event) =>
                              updateColumn(table.id, column.id, (prev) => ({
                                ...prev,
                                nullable: !event.target.checked,
                              }))
                            }
                          />
                          NOT NULL
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#666]">
                          <input
                            type="checkbox"
                            checked={column.primary}
                            onChange={(event) =>
                              updateColumn(table.id, column.id, (prev) => ({
                                ...prev,
                                primary: event.target.checked,
                                unique: event.target.checked
                                  ? true
                                  : prev.unique,
                              }))
                            }
                          />
                          PRIMARY
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#666]">
                          <input
                            type="checkbox"
                            checked={column.unique}
                            onChange={(event) =>
                              updateColumn(table.id, column.id, (prev) => ({
                                ...prev,
                                unique: event.target.checked,
                              }))
                            }
                          />
                          UNIQUE
                        </label>
                        <button
                          type="button"
                          onClick={() => removeColumn(table.id, column.id)}
                          className="px-3 py-1 text-xs border border-[#333] text-[#ff6b6b] transition-colors"
                        >
                          REMOVE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#333] bg-[#111] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[#39ff14] text-sm mb-1">
                  ▓▓▓ SEED DATA LAB ▓▓▓
                </h2>
                <p className="text-sm text-[#666]">
                  Generate dummy rows or craft each row by hand.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#666]">
                  Rows per table
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={rowsPerTable}
                    onChange={(event) =>
                      setRowsPerTable(
                        Math.min(
                          25,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      )
                    }
                    className="w-16 border border-[#333] bg-[#0d0d0d] px-2 py-1 text-sm text-[#e5e5e5]"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleGenerateData}
                  className="px-4 py-2 bg-[#39ff14] text-[#0d0d0d] text-xs font-bold hover:bg-[#2ee00d] transition-colors"
                >
                  AUTO-FILL
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {tables.map((table, tableIndex) => {
                const rows = rowsByTable[table.id] ?? [];
                return (
                  <div
                    key={table.id}
                    className="border border-[#2a2a2a] bg-[#0f0f10] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#e5e5e5]">
                          {table.name}
                        </h3>
                        <p className="text-xs text-[#666]">
                          {rows.length} rows
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRowsByTable((prev) => ({
                              ...prev,
                              [table.id]: generateRowsForTable(
                                table,
                                rowsPerTable,
                                tableIndex,
                              ),
                            }))
                          }
                          className="px-3 py-1 text-xs border border-[#333] text-[#999] hover:text-[#e5e5e5] transition-colors"
                        >
                          FILL TABLE
                        </button>
                        <button
                          type="button"
                          onClick={() => addRow(table.id)}
                          className="px-3 py-1 text-xs border border-[#333] text-[#999] hover:text-[#e5e5e5] transition-colors"
                        >
                          ADD ROW
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden border border-[#2a2a2a]">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-[#1a1a1a]">
                            {table.columns.map((column) => (
                              <TableHead
                                key={column.id}
                                className="text-[#666]"
                              >
                                {column.name}
                              </TableHead>
                            ))}
                            <TableHead className="w-16 text-[#666]">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={table.columns.length + 1}>
                                <div className="py-6 text-center text-sm text-[#666]">
                                  No rows yet. Auto-fill or add a row to start.
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {rows.map((row, rowIndex) => (
                            <TableRow key={`${table.id}-${rowIndex}`}>
                              {table.columns.map((column) => (
                                <TableCell key={column.id} className="p-2">
                                  <input
                                    className="w-full border border-[#333] bg-[#0d0d0d] px-2 py-1 text-xs text-[#e5e5e5]"
                                    value={row[column.name] ?? ""}
                                    onChange={(event) =>
                                      updateRowValue(
                                        table.id,
                                        rowIndex,
                                        column.name,
                                        event.target.value,
                                      )
                                    }
                                  />
                                </TableCell>
                              ))}
                              <TableCell className="p-2">
                                <button
                                  type="button"
                                  onClick={() => removeRow(table.id, rowIndex)}
                                  className="px-2 py-1 text-[10px] border border-[#333] text-[#ff6b6b]"
                                >
                                  Remove
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-6 min-w-0">
          <div className="border border-[#333] bg-[#111] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[#39ff14] text-sm mb-1">
                  ▓▓▓ QUERY RESULTS ▓▓▓
                </h2>
                <p className="text-sm text-[#666]">
                  Results from the latest run appear here.
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#666]">
                {result?.row_count !== undefined
                  ? `${result.row_count} rows`
                  : "No run yet"}
              </div>
            </div>

            {error && (
              <div className="mt-4 border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 p-4 text-sm text-[#ff6b6b]">
                {error}
              </div>
            )}

            <div className="mt-4">
              {result?.rows && result.rows.length > 0 ? (
                <DataTable
                  data={result.rows}
                  tableName=""
                  maxRows={25}
                  className="border border-[#2a2a2a]"
                  tableClassName="border-separate border-spacing-0"
                  captionClassName="text-[#666]"
                  headerClassName="border border-[#2a2a2a] text-[#e5e5e5] font-semibold"
                  cellClassName="border border-[#2a2a2a] text-[#cfcfcf]"
                />
              ) : (
                <div className="border border-dashed border-[#333] bg-[#0f0f10] p-6 text-center text-sm text-[#666]">
                  Run a query to see results.
                </div>
              )}
            </div>
          </div>
          <div className="border border-[#333] bg-[#111] p-6">
            <h2 className="text-[#39ff14] text-sm mb-1">
              ▓▓▓ SQL CONTROL ROOM ▓▓▓
            </h2>
            <p className="text-sm text-[#666]">
              The builder creates tables + inserts. Write your own query for the
              final statement.
            </p>

            <div className="mt-4 border border-[#2a2a2a] bg-[#0f0f10] p-4">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="SELECT * FROM users;"
                className="min-h-[160px] w-full resize-none bg-transparent text-sm text-[#e5e5e5] outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#666]">
                <span>Last statement runs after the builder SQL.</span>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="px-3 py-1 text-[10px] border border-[#333] text-[#999] hover:text-[#e5e5e5] transition-colors"
                >
                  {isRunning ? "RUNNING..." : "Execute now"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-[#666]">
                <span>SQL bundle</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!sqlBundleText) return;
                    await navigator.clipboard.writeText(sqlBundleText);
                    setIsBundleCopied(true);
                    setTimeout(() => setIsBundleCopied(false), 1200);
                  }}
                  className={`border px-3 py-1 text-[10px] transition-colors ${
                    isBundleCopied
                      ? "border-[#39ff14] bg-[#39ff14] text-[#0d0d0d]"
                      : "border-[#333] text-[#999] hover:text-[#e5e5e5]"
                  }`}
                >
                  {isBundleCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="max-h-[240px] overflow-auto border border-[#2a2a2a] bg-[#0f0f10] p-4 text-xs text-[#999]">
                {sqlBundleText}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
