"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  s.id, s.shape, s.color,
  d.width, d.height, d.rotation
FROM shapes s
JOIN dimensions d ON s.id = d.shape_id
WHERE s.color IN ('red', 'blue', 'yellow')`;

function BauhausTable({ table, index }: { table: TableSchema; index: number }) {
  const colors = ["bg-red-500", "bg-blue-600", "bg-yellow-400"];
  const bgColor = colors[index % 3];
  const textColor = index % 3 === 2 ? "text-black" : "text-white";

  return (
    <div className="relative">
      {/* Decorative shape */}
      <div className={`absolute -top-3 -left-3 w-8 h-8 ${bgColor} ${index % 2 === 0 ? "rounded-full" : ""}`} />
      
      <div className="border-4 border-black bg-white p-5 ml-2 mt-2">
        <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-3">
          <span className={`w-4 h-4 ${bgColor} inline-block`} />
          {table.name}
        </h3>
        <div className="space-y-2">
          {table.columns.map((col: ColumnSchema, i) => (
            <div key={col.name} className="flex items-center gap-3 group">
              <div className={`w-3 h-3 border-2 border-black ${i % 2 === 0 ? "rounded-full" : ""} group-hover:bg-black transition-colors`} />
              <span className="font-bold flex-1">{col.name}</span>
              <span className="text-sm text-gray-500 font-mono">{col.type || "text"}</span>
              {col.is_primary && (
                <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-black">PK</span>
              )}
              {col.is_foreign && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black">FK</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BauhausDataTable({ tableName, rows, index }: { tableName: string; rows: Record<string, unknown>[]; index: number }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const colors = ["border-red-500", "border-blue-600", "border-yellow-400"];
  const headerBg = ["bg-red-500", "bg-blue-600", "bg-yellow-400"];
  const borderColor = colors[index % 3];
  const headerBgColor = headerBg[index % 3];
  const headerText = index % 3 === 2 ? "text-black" : "text-white";

  return (
    <div className={`border-4 border-black ${borderColor} border-l-8 bg-white overflow-hidden`}>
      <div className={`${headerBgColor} ${headerText} px-4 py-3 font-black text-lg uppercase tracking-tight flex justify-between items-center`}>
        <span>{tableName}</span>
        <span className="text-sm font-normal opacity-80">{rows.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black">
              {columns.map((col) => (
                <th key={col} className="text-left font-black uppercase text-sm px-4 py-2 bg-gray-100">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-sm">
                    {row[col] === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className="truncate block max-w-[150px]">{String(row[col])}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BauhausView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f0e6] text-black">
      {/* Header */}
      <header className="border-b-4 border-black bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-red-500 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase">SEEQL</h1>
                <p className="text-xs tracking-[0.3em] uppercase text-gray-500">Form Follows Function</p>
              </div>
            </div>

            <nav className="flex gap-1">
              {[
                { href: "/1", label: "01" },
                { href: "/2", label: "02" },
                { href: "/6", label: "06" },
                { href: "/7", label: "07" },
                { href: "/8", label: "08", active: true },
                { href: "/9", label: "09" },
                { href: "/10", label: "10" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`w-10 h-10 flex items-center justify-center font-black text-sm transition-colors ${
                    item.active
                      ? "bg-black text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-black text-white py-12 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-yellow-400" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-blue-600 rotate-45" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            Query<br />
            <span className="text-yellow-400">Visualize</span><br />
            Create
          </h2>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Query Section */}
        <section className="mb-12">
          <div className="flex items-end gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <h3 className="text-xl font-black uppercase tracking-tight">Input Query</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase">Rows</span>
                <input
                  type="number"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-10 px-2 border-4 border-black text-center font-bold focus:outline-none"
                  min={1}
                  max={100}
                />
              </div>
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                className="h-10 px-8 bg-black text-white font-black uppercase tracking-tight hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "..." : "Execute"}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-2 -left-2 w-full h-full bg-yellow-400" />
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleRun();
                }
              }}
              placeholder={EXAMPLE_QUERY}
              className="relative z-10 w-full min-h-[200px] p-6 bg-white text-black font-mono text-sm resize-none border-4 border-black focus:outline-none placeholder:text-gray-400"
              spellCheck={false}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3 font-bold uppercase tracking-wide">
            ⌘ + Enter to execute
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-8 p-6 bg-red-500 text-white border-4 border-black">
            <span className="font-black uppercase mr-2">Error:</span>
            {error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Schema */}
            {schema && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-4 h-4 bg-blue-600" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Schema</h3>
                </div>
                <div className="space-y-8">
                  {schema.tables.map((table: TableSchema, i) => (
                    <BauhausTable key={table.name} table={table} index={i} />
                  ))}
                </div>

                {schema.relationships && schema.relationships.length > 0 && (
                  <div className="mt-8 p-4 border-4 border-black border-dashed">
                    <h4 className="font-black uppercase text-sm mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-black rounded-full" />
                      Relationships
                    </h4>
                    <div className="space-y-2 font-mono text-sm">
                      {schema.relationships.map((rel, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-bold">{rel.LeftTable}.{rel.LeftColumn}</span>
                          <span className="text-red-500 font-black">→</span>
                          <span className="font-bold">{rel.RightTable}.{rel.RightColumn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Data */}
            {data && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-4 h-4 bg-yellow-400" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Data</h3>
                </div>
                <div className="space-y-6">
                  {Object.entries(data).map(([tableName, rows], i) => (
                    <BauhausDataTable key={tableName} tableName={tableName} rows={rows} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-20">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-black" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-400 rounded-full" />
              <div className="absolute top-0 right-0 w-8 h-8 bg-red-500" />
              <div className="absolute bottom-0 left-0 w-8 h-8 bg-blue-600" />
            </div>
            <p className="text-xl font-black uppercase tracking-tight text-gray-400">
              Awaiting Input
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-blue-600" />
            <div className="w-3 h-3 bg-yellow-400" />
          </div>
          <span className="font-black text-sm uppercase tracking-wider">View 08 / 10</span>
        </div>
      </footer>
    </div>
  );
}
