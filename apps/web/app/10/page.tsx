"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  g.name, g.location, g.established,
  a.title, a.medium, a.year
FROM galleries g
JOIN artworks a ON g.id = a.gallery_id
WHERE a.year > 2000`;

function ZenTable({ table }: { table: TableSchema }) {
  return (
    <div className="mb-12">
      <div className="flex items-baseline gap-4 mb-6">
        <h3 className="text-2xl font-light tracking-wide text-stone-800">{table.name}</h3>
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 tracking-widest uppercase">{table.columns.length} columns</span>
      </div>
      <div className="space-y-4 pl-6 border-l border-stone-200">
        {table.columns.map((col: ColumnSchema) => (
          <div key={col.name} className="flex items-baseline gap-4">
            <span className="text-stone-700 flex-1">{col.name}</span>
            <span className="text-xs text-stone-400">{col.type || "text"}</span>
            {col.is_primary && (
              <span className="text-xs text-stone-500 border-b border-stone-300 pb-0.5">primary</span>
            )}
            {col.is_foreign && (
              <span className="text-xs text-stone-500 border-b border-dashed border-stone-300 pb-0.5">
                → {col.ref_table}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ZenDataTable({ tableName, rows }: { tableName: string; rows: Record<string, unknown>[] }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="mb-12">
      <div className="flex items-baseline gap-4 mb-6">
        <h3 className="text-2xl font-light tracking-wide text-stone-800">{tableName}</h3>
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 tracking-widest uppercase">{rows.length} records</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left text-xs text-stone-400 pb-3 pr-8 font-normal tracking-wider uppercase border-b border-stone-100">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row, i) => (
              <tr key={i} className="border-b border-stone-50">
                {columns.map((col) => (
                  <td key={col} className="py-4 pr-8 text-stone-600 text-sm">
                    {row[col] === null ? (
                      <span className="text-stone-300">—</span>
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
    </div>
  );
}

export default function ZenView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] text-stone-700">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-8 pt-16 pb-12">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-8">
            <a href="/" className="text-stone-400 hover:text-stone-600 transition-colors text-sm tracking-widest">
              ← 戻る
            </a>
          </div>
          <div className="flex gap-8 text-xs tracking-widest uppercase text-stone-400">
            <a href="/1" className="hover:text-stone-600 transition-colors">一</a>
            <a href="/2" className="hover:text-stone-600 transition-colors">二</a>
            <a href="/6" className="hover:text-stone-600 transition-colors">六</a>
            <a href="/7" className="hover:text-stone-600 transition-colors">七</a>
            <a href="/8" className="hover:text-stone-600 transition-colors">八</a>
            <a href="/9" className="hover:text-stone-600 transition-colors">九</a>
            <a href="/10" className="text-stone-700">十</a>
          </div>
        </nav>

        <div className="text-center">
          <p className="text-xs tracking-[0.4em] text-stone-400 uppercase mb-4">SQL Visualization</p>
          <h1 className="text-5xl md:text-6xl font-extralight tracking-tight text-stone-800 mb-4">
            見る
          </h1>
          <p className="text-sm text-stone-400 tracking-wide">
            To see. To visualize. To understand.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 pb-24">
        {/* Query Input */}
        <section className="mb-20">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-xs tracking-[0.3em] text-stone-400 uppercase">Query</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <div className="relative">
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
              className="w-full min-h-[200px] p-8 bg-white text-stone-700 font-mono text-sm resize-none border-0 shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-200 placeholder:text-stone-300 leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-stone-400">
              Press <span className="text-stone-500">⌘ Enter</span> to execute
            </p>
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400 tracking-wider">Rows</span>
                <input
                  type="number"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 bg-white text-stone-700 text-sm text-center shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-200"
                  min={1}
                  max={100}
                />
              </div>
              
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                className="px-8 py-3 bg-stone-800 text-stone-100 text-sm tracking-wider hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? "..." : "Execute"}
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-16 p-6 bg-red-50 border-l-2 border-red-300 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <>
            {/* Schema */}
            {schema && (
              <section className="mb-20">
                <div className="flex items-baseline gap-4 mb-12">
                  <span className="text-xs tracking-[0.3em] text-stone-400 uppercase">Structure</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {schema.tables.map((table: TableSchema) => (
                  <ZenTable key={table.name} table={table} />
                ))}

                {schema.relationships && schema.relationships.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-stone-100">
                    <p className="text-xs tracking-[0.2em] text-stone-400 uppercase mb-6">Connections</p>
                    <div className="space-y-3 pl-6 border-l border-stone-200">
                      {schema.relationships.map((rel, i) => (
                        <div key={i} className="text-sm text-stone-500">
                          <span className="text-stone-700">{rel.LeftTable}</span>
                          <span className="mx-3 text-stone-300">→</span>
                          <span className="text-stone-700">{rel.RightTable}</span>
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
                <div className="flex items-baseline gap-4 mb-12">
                  <span className="text-xs tracking-[0.3em] text-stone-400 uppercase">Data</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {Object.entries(data).map(([tableName, rows]) => (
                  <ZenDataTable key={tableName} tableName={tableName} rows={rows} />
                ))}
              </section>
            )}
          </>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-24">
            <div className="w-px h-24 bg-stone-200 mx-auto mb-8" />
            <p className="text-stone-400 text-sm tracking-wide">
              Begin with a query
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-8 py-12 border-t border-stone-100">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="tracking-wider">Seeql</span>
          <span className="tracking-[0.3em]">十 / 10</span>
        </div>
      </footer>
    </div>
  );
}
