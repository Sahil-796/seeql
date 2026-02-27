"use client";

import { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  data: Record<string, unknown>[];
  tableName: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  captionClassName?: string;
  maxRows?: number;
  getRowKey?: (row: Record<string, unknown>, index: number) => string;
}

export function DataTable({
  data,
  tableName,
  className = "",
  tableClassName = "",
  headerClassName = "",
  cellClassName = "",
  captionClassName = "",
  maxRows = 50,
  getRowKey,
}: DataTableProps) {
  const [page, _setPage] = useState(0);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const displayData = data.slice(page * maxRows, (page + 1) * maxRows);

  if (data.length === 0) {
    return (
      <div className={`text-center opacity-50 py-8 ${className}`}>
        No data available for {tableName}
      </div>
    );
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className={className}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className={headerClassName}>
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row, rowIndex) => (
            <TableRow key={getRowKey?.(row, rowIndex) ?? `${page}-${rowIndex}`}>
              {columns.map((col) => (
                <TableCell key={col} className={cellClassName}>
                  <span className="block max-w-[200px] truncate">
                    {formatValue(row[col])}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface MultiTableDataProps {
  data: Record<string, Record<string, unknown>[]>;
  className?: string;
  tableWrapperClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  captionClassName?: string;
  getRowKey?: (row: Record<string, unknown>, index: number) => string;
}

export function MultiTableData({
  data,
  className = "",
  tableWrapperClassName = "",
  tableClassName = "",
  headerClassName = "",
  cellClassName = "",
  captionClassName = "",
  getRowKey,
}: MultiTableDataProps) {
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const tableNames = Object.keys(data);

  const selectedTable = activeTable || tableNames[0];

  if (tableNames.length === 0) {
    return (
      <div className={`text-center opacity-50 py-8 ${className}`}>
        No data generated
      </div>
    );
  }

  return (
    <div className={className}>
      {tableNames.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tableNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveTable(name)}
              type="button"
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
                selectedTable === name
                  ? "bg-current/10 font-medium"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {name}
              <span className="ml-1.5 opacity-50">
                ({data[name]?.length || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={tableWrapperClassName}>
        <DataTable
          data={data[selectedTable] || []}
          tableName={selectedTable}
          tableClassName={tableClassName}
          headerClassName={headerClassName}
          cellClassName={cellClassName}
          captionClassName={captionClassName}
          getRowKey={getRowKey}
        />
      </div>
    </div>
  );
}
