"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  p.id, p.name, p.material,
  s.width, s.height, s.tolerance
FROM parts p
JOIN specifications s ON p.id = s.part_id
WHERE s.tolerance < 0.05`;

function BlueprintTable({ table }: { table: TableSchema }) {
  return (
    <div className="border-2 border-blue-400/60 bg-blue-950/20 p-4 relative">
      {/* Corner markers */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-400/30 border-dashed">
        <div className="w-8 h-8 border border-blue-400 flex items-center justify-center text-blue-300 text-xs font-mono">
          TBL
        </div>
        <div>
          <h3 className="text-blue-200 font-mono text-sm tracking-wider uppercase">{table.name}</h3>
          <p className="text-blue-400/50 text-xs font-mono">{table.columns.length} FIELDS</p>
        </div>
      </div>

      {/* Columns */}
      <div className="space-y-2 font-mono text-xs">
        {table.columns.map((col: ColumnSchema, i) => (
          <div key={col.name} className="flex items-center gap-4 text-blue-300/80">
            <span className="text-blue-500/50 w-6">{String(i + 1).padStart(2, "0")}.</span>
            <span className="flex-1">{col.name}</span>
            <span className="text-blue-400/40">{col.type || "VARCHAR"}</span>
            {col.is_primary && <span className="text-yellow-400/80">[PK]</span>}
            {col.is_foreign && <span className="text-cyan-400/80">[FK]</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlueprintDataTable({ tableName, rows }: { tableName: string; rows: Record<string, unknown>[] }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="border-2 border-blue-400/60 bg-blue-950/20 relative">
      {/* Corner markers */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400" />

      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-400/30 border-dashed flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-blue-400 flex items-center justify-center text-blue-300 text-[10px] font-mono">
            D
          </div>
          <span className="font-mono text-sm text-blue-200 tracking-wider uppercase">{tableName}</span>
        </div>
        <span className="font-mono text-xs text-blue-400/50">{rows.length} RECORDS</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-blue-400/20">
              {columns.map((col) => (
                <th key={col} className="text-left text-blue-400/60 px-4 py-2 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row, i) => (
              <tr key={i} className="border-b border-blue-400/10 hover:bg-blue-400/5">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-blue-200/70">
                    {row[col] === null ? (
                      <span className="text-blue-400/30">NULL</span>
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

export default function BlueprintView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-blue-100 relative overflow-hidden">
      {/* Blueprint grid background */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-blue-400/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-400 flex items-center justify-center">
              <span className="font-mono text-blue-300 text-lg">S</span>
            </div>
            <div>
              <h1 className="font-mono text-lg tracking-[0.2em] text-blue-200">SEEQL</h1>
              <p className="font-mono text-[10px] text-blue-400/50 tracking-widest">TECHNICAL DRAWING REV.6</p>
            </div>
          </div>

          <nav className="flex gap-6 font-mono text-xs tracking-wider">
            <a href="/1" className="text-blue-400/50 hover:text-blue-300 transition-colors">01.EDIT</a>
            <a href="/2" className="text-blue-400/50 hover:text-blue-300 transition-colors">02.TERM</a>
            <a href="/6" className="text-blue-300 border-b border-blue-400 pb-0.5">06.PRINT</a>
            <a href="/7" className="text-blue-400/50 hover:text-blue-300 transition-colors">07.NEWS</a>
            <a href="/8" className="text-blue-400/50 hover:text-blue-300 transition-colors">08.HAUS</a>
            <a href="/9" className="text-blue-400/50 hover:text-blue-300 transition-colors">09.RETRO</a>
            <a href="/10" className="text-blue-400/50 hover:text-blue-300 transition-colors">10.ZEN</a>
          </nav>
        </div>
      </header>

      {/* Title Block */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="border-2 border-blue-400/40 p-6 bg-blue-950/30">
          <div className="grid grid-cols-4 gap-4 font-mono text-xs">
            <div className="col-span-2 border-r border-blue-400/20 pr-4">
              <p className="text-blue-400/50 mb-1">PROJECT TITLE</p>
              <p className="text-blue-200 text-lg tracking-wider">SQL SCHEMA ANALYSIS</p>
            </div>
            <div className="border-r border-blue-400/20 pr-4">
              <p className="text-blue-400/50 mb-1">DRAWING NO.</p>
              <p className="text-blue-200">SEEQL-006</p>
            </div>
            <div>
              <p className="text-blue-400/50 mb-1">SCALE</p>
              <p className="text-blue-200">1:1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Query Input */}
        <section className="mb-8">
          <div className="border-2 border-blue-400/40 bg-blue-950/30 p-6 relative">
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border border-blue-400 flex items-center justify-center text-blue-300 text-[10px] font-mono">
                  Q
                </div>
                <span className="font-mono text-sm text-blue-200 tracking-wider">QUERY INPUT</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400/50">ROWS:</span>
                  <input
                    type="number"
                    value={rowCount}
                    onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-1 bg-blue-950/50 border border-blue-400/30 text-blue-200 text-center focus:outline-none focus:border-blue-400"
                    min={1}
                    max={100}
                  />
                </div>
                <button
                  onClick={handleRun}
                  disabled={isLoading || !sql.trim()}
                  className="px-6 py-2 border-2 border-blue-400 text-blue-200 tracking-wider hover:bg-blue-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "PROCESSING..." : "EXECUTE"}
                </button>
              </div>
            </div>

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
              className="w-full min-h-[160px] p-4 bg-blue-950/50 text-blue-100 font-mono text-sm resize-none border border-blue-400/20 focus:outline-none focus:border-blue-400/50 placeholder:text-blue-400/30"
              spellCheck={false}
            />

            <div className="flex items-center justify-between mt-3 font-mono text-[10px] text-blue-400/40">
              <span>CMD+ENTER TO EXECUTE</span>
              <span>DIMENSIONS: AUTO</span>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 border-2 border-red-400/50 bg-red-950/20 font-mono text-sm text-red-300">
            <span className="text-red-400 mr-2">ERROR:</span> {error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Schema */}
            {schema && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 border border-blue-400 flex items-center justify-center text-blue-300 text-[10px] font-mono">
                    S
                  </div>
                  <span className="font-mono text-sm text-blue-200 tracking-wider">SCHEMA ANALYSIS</span>
                </div>
                <div className="space-y-4">
                  {schema.tables.map((table: TableSchema) => (
                    <BlueprintTable key={table.name} table={table} />
                  ))}
                </div>

                {schema.relationships && schema.relationships.length > 0 && (
                  <div className="mt-6 border-2 border-blue-400/40 border-dashed p-4">
                    <p className="font-mono text-xs text-blue-400/60 mb-3 tracking-wider">RELATIONSHIPS</p>
                    <div className="space-y-2 font-mono text-xs">
                      {schema.relationships.map((rel, i) => (
                        <div key={i} className="flex items-center gap-2 text-blue-300/70">
                          <span className="text-blue-400/40">[{i + 1}]</span>
                          <span>{rel.LeftTable}.{rel.LeftColumn}</span>
                          <span className="text-blue-400/40">---&gt;</span>
                          <span>{rel.RightTable}.{rel.RightColumn}</span>
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 border border-blue-400 flex items-center justify-center text-blue-300 text-[10px] font-mono">
                    D
                  </div>
                  <span className="font-mono text-sm text-blue-200 tracking-wider">DATA OUTPUT</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(data).map(([tableName, rows]) => (
                    <BlueprintDataTable key={tableName} tableName={tableName} rows={rows} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 border-2 border-blue-400/30 border-dashed flex items-center justify-center">
              <div className="w-12 h-12 border border-blue-400/40 flex items-center justify-center font-mono text-blue-400/40 text-xs">
                N/A
              </div>
            </div>
            <p className="font-mono text-sm text-blue-400/50 tracking-wider">
              AWAITING QUERY INPUT
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-blue-400/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between font-mono text-[10px] text-blue-400/40">
          <span>SEEQL BLUEPRINT EDITION</span>
          <span>VIEW 06 OF 10</span>
        </div>
      </footer>
    </div>
  );
}
