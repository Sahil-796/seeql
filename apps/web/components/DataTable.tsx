"use client";

import { useState, useMemo } from "react";

interface DataTableProps {
  data: Record<string, unknown>[];
  tableName: string;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  maxRows?: number;
}

export function DataTable({
  data,
  tableName,
  className = "",
  headerClassName = "",
  cellClassName = "",
  maxRows = 50,
}: DataTableProps) {
  const [page, setPage] = useState(0);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const totalPages = Math.ceil(data.length / maxRows);
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`text-left font-medium px-3 py-2 ${headerClassName}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td
                    key={col}
                    className={`px-3 py-2 ${cellClassName}`}
                  >
                    <span className="truncate block max-w-[200px]">
                      {formatValue(row[col])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="opacity-60">
            Showing {page * maxRows + 1}-{Math.min((page + 1) * maxRows, data.length)} of{" "}
            {data.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiTableDataProps {
  data: Record<string, Record<string, unknown>[]>;
  className?: string;
  tableWrapperClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export function MultiTableData({
  data,
  className = "",
  tableWrapperClassName = "",
  headerClassName = "",
  cellClassName = "",
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
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
                selectedTable === name
                  ? "bg-current/10 font-medium"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {name}
              <span className="ml-1.5 opacity-50">({data[name]?.length || 0})</span>
            </button>
          ))}
        </div>
      )}

      <div className={tableWrapperClassName}>
        <DataTable
          data={data[selectedTable] || []}
          tableName={selectedTable}
          headerClassName={headerClassName}
          cellClassName={cellClassName}
        />
      </div>
    </div>
  );
}
