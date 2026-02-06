"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  c.id, c.name, c.tier,
  t.amount, t.currency, t.timestamp
FROM clients c
INNER JOIN transactions t 
  ON c.id = t.client_id
WHERE c.tier = 'platinum'`;

function GoldDivider() {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <div className="w-2 h-2 rotate-45 bg-amber-500/50" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
    </div>
  );
}

function LuxuryTable({ table }: { table: TableSchema }) {
  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-amber-300/10 to-amber-500/20 rounded-sm opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
      
      <div className="relative bg-zinc-900/80 border border-amber-500/20 p-6">
        {/* Table Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-amber-500/10">
          <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 text-zinc-900 font-serif text-xl">
            {table.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-amber-100 font-serif text-lg tracking-wide">{table.name}</h3>
            <p className="text-zinc-500 text-xs tracking-widest uppercase">
              {table.columns.length} columns
            </p>
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-1">
          {table.columns.map((col: ColumnSchema) => (
            <div
              key={col.name}
              className="flex items-center justify-between py-3 px-4 -mx-4 hover:bg-amber-500/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-amber-100/90 font-light tracking-wide">{col.name}</span>
                {col.is_primary && (
                  <span className="px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Primary
                  </span>
                )}
                {col.is_foreign && (
                  <span className="px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase bg-zinc-700/50 text-zinc-400 border border-zinc-600/50">
                    Foreign
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-600 font-mono">{col.type || "varchar"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LuxuryDataTable({ 
  tableName, 
  rows 
}: { 
  tableName: string; 
  rows: Record<string, unknown>[] 
}) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-transparent to-amber-500/20 rounded-sm opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
      
      <div className="relative bg-zinc-900/80 border border-amber-500/20 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900 border-b border-amber-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-amber-100 font-serif tracking-wide">{tableName}</h3>
            <span className="text-xs text-amber-500/60 tracking-widest uppercase">
              {rows.length} Records
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-500/10">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left text-[10px] tracking-[0.15em] uppercase text-amber-500/60 px-6 py-4 font-normal"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr 
                  key={i} 
                  className="border-b border-zinc-800/50 hover:bg-amber-500/5 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-6 py-4 text-sm text-zinc-300 font-light">
                      {row[col] === null ? (
                        <span className="text-zinc-600 italic">null</span>
                      ) : (
                        <span className="truncate block max-w-[200px]">{String(row[col])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 10 && (
          <div className="px-6 py-3 text-center text-xs text-zinc-600 border-t border-zinc-800/50">
            Displaying 10 of {rows.length} records
          </div>
        )}
      </div>
    </div>
  );
}

export default function LuxuryView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-amber-500/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-zinc-900 font-serif text-xl">S</span>
            </div>
            <div>
              <h1 className="font-serif text-xl tracking-[0.1em] text-amber-100">SEEQL</h1>
              <p className="text-[10px] tracking-[0.3em] text-amber-500/50 uppercase">Premier Edition</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <nav className="flex gap-8 text-xs tracking-[0.15em] uppercase">
              <a href="/1" className="text-zinc-500 hover:text-amber-400 transition-colors">Editorial</a>
              <a href="/2" className="text-zinc-500 hover:text-amber-400 transition-colors">Terminal</a>
              <a href="/3" className="text-zinc-500 hover:text-amber-400 transition-colors">Organic</a>
              <a href="/4" className="text-amber-400 border-b border-amber-400 pb-0.5">Luxury</a>
              <a href="/5" className="text-zinc-500 hover:text-amber-400 transition-colors">Neon</a>
            </nav>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative z-10 max-w-7xl mx-auto px-8 py-20 text-center">
        <p className="text-[10px] tracking-[0.4em] text-amber-500/60 uppercase mb-4">SQL Visualization</p>
        <h2 className="font-serif text-5xl text-amber-50 mb-6 tracking-wide">
          Craft Your Query
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto font-light tracking-wide">
          Experience schema inference and data generation with unparalleled elegance
        </p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pb-20">
        {/* Query Section */}
        <section className="mb-16">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 via-amber-300/10 to-amber-500/30 rounded-sm opacity-50 group-hover:opacity-70 blur transition-opacity duration-500" />
            
            <div className="relative bg-zinc-900/90 border border-amber-500/20 p-8">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-[10px] tracking-[0.3em] text-amber-500/50 uppercase">Query Editor</span>
                  <h3 className="font-serif text-xl text-amber-100 mt-1">Write Your Statement</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 tracking-wider">Records</span>
                    <input
                      type="number"
                      value={rowCount}
                      onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-3 py-2 bg-zinc-800/50 border border-amber-500/20 text-amber-100 text-center text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                      min={1}
                      max={100}
                    />
                  </div>
                  <button
                    onClick={handleRun}
                    disabled={isLoading || !sql.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-900 text-sm tracking-[0.15em] uppercase font-medium hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-amber-500/20"
                  >
                    {isLoading ? "Processing..." : "Execute"}
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
                className="w-full min-h-[200px] p-6 bg-zinc-950/50 text-amber-100/90 font-mono text-sm resize-none border border-zinc-800/50 focus:outline-none focus:border-amber-500/30 placeholder:text-zinc-700 transition-colors"
                spellCheck={false}
              />

              <div className="flex items-center justify-between mt-4 text-xs text-zinc-600">
                <span>Press ⌘ + Enter to execute</span>
                <span className="tracking-wider">TAB for indentation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-12 p-6 bg-red-950/30 border border-red-500/30 text-red-400 font-light tracking-wide">
            <span className="text-red-500 font-medium mr-2">Error:</span>
            {error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <>
            <GoldDivider />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Schema Section */}
              {schema && (
                <section>
                  <div className="mb-8">
                    <span className="text-[10px] tracking-[0.3em] text-amber-500/50 uppercase">Analysis</span>
                    <h3 className="font-serif text-2xl text-amber-100 mt-1">Inferred Schema</h3>
                  </div>
                  <div className="space-y-6">
                    {schema.tables.map((table: TableSchema) => (
                      <LuxuryTable key={table.name} table={table} />
                    ))}
                  </div>

                  {schema.relationships && schema.relationships.length > 0 && (
                    <div className="mt-8 p-6 bg-zinc-900/50 border border-amber-500/10">
                      <h4 className="text-xs tracking-[0.2em] text-amber-500/60 uppercase mb-4">Relationships</h4>
                      <div className="space-y-2">
                        {schema.relationships.map((rel, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-zinc-400 font-light">
                            <span className="text-amber-100">{rel.LeftTable}.{rel.LeftColumn}</span>
                            <span className="text-amber-500/40">→</span>
                            <span className="text-amber-100">{rel.RightTable}.{rel.RightColumn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Data Section */}
              {data && (
                <section>
                  <div className="mb-8">
                    <span className="text-[10px] tracking-[0.3em] text-amber-500/50 uppercase">Output</span>
                    <h3 className="font-serif text-2xl text-amber-100 mt-1">Generated Data</h3>
                  </div>
                  <div className="space-y-6">
                    {Object.entries(data).map(([tableName, rows]) => (
                      <LuxuryDataTable key={tableName} tableName={tableName} rows={rows} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-8 border border-amber-500/20 flex items-center justify-center">
              <div className="w-8 h-8 border border-amber-500/30 rotate-45" />
            </div>
            <p className="text-zinc-500 font-light tracking-wide">
              Enter a SQL query to begin your exploration
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-500/10 px-8 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span className="tracking-[0.2em]">SEEQL PREMIER</span>
          <span className="tracking-wider">View 4 of 5</span>
        </div>
      </footer>
    </div>
  );
}
