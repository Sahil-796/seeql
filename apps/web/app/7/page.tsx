"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  a.headline, a.byline, a.published_at,
  c.name as category, c.section
FROM articles a
JOIN categories c ON a.category_id = c.id
WHERE a.published_at > '2024-01-01'`;

function NewspaperTable({ table }: { table: TableSchema }) {
  return (
    <div className="border-b-2 border-stone-900 pb-4 mb-4">
      <h3 className="font-serif text-xl font-bold text-stone-900 mb-3 border-b border-stone-300 pb-1">
        {table.name.toUpperCase()}
      </h3>
      <div className="columns-2 gap-4 text-sm">
        {table.columns.map((col: ColumnSchema) => (
          <div key={col.name} className="break-inside-avoid mb-2 flex justify-between">
            <span className="text-stone-700">
              {col.name}
              {col.is_primary && <sup className="text-stone-500 ml-0.5">*</sup>}
              {col.is_foreign && <sup className="text-stone-500 ml-0.5">†</sup>}
            </span>
            <span className="text-stone-400 text-xs italic">{col.type || "text"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewspaperDataTable({ tableName, rows }: { tableName: string; rows: Record<string, unknown>[] }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="mb-6">
      <h3 className="font-serif text-lg font-bold text-stone-900 border-b-2 border-stone-900 pb-1 mb-3">
        {tableName.toUpperCase()}
        <span className="font-normal text-sm text-stone-500 ml-2">({rows.length} records)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-stone-400">
              {columns.map((col) => (
                <th key={col} className="text-left font-serif font-bold text-stone-700 py-1 px-2 text-xs uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-stone-200">
                {columns.map((col) => (
                  <td key={col} className="py-1.5 px-2 text-stone-600">
                    {row[col] === null ? (
                      <span className="italic text-stone-400">null</span>
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

export default function NewspaperView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f5f1e8]">
      {/* Newspaper texture */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Masthead */}
      <header className="relative z-10 border-b-4 border-double border-stone-900 bg-[#f5f1e8]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* Top bar */}
          <div className="flex justify-between items-center text-xs text-stone-500 mb-2 font-serif">
            <span>Est. 2024</span>
            <span>{today}</span>
            <span>Price: Free</span>
          </div>
          
          {/* Title */}
          <div className="text-center border-y border-stone-400 py-3">
            <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight text-stone-900">
              THE SEEQL TIMES
            </h1>
            <p className="font-serif text-sm text-stone-600 mt-1 italic">
              "All the Data That's Fit to Query"
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex justify-center gap-6 py-2 text-xs font-serif uppercase tracking-wider border-b border-stone-300">
            <a href="/1" className="text-stone-500 hover:text-stone-900">Editorial</a>
            <a href="/2" className="text-stone-500 hover:text-stone-900">Terminal</a>
            <a href="/6" className="text-stone-500 hover:text-stone-900">Blueprint</a>
            <a href="/7" className="text-stone-900 font-bold">Newspaper</a>
            <a href="/8" className="text-stone-500 hover:text-stone-900">Bauhaus</a>
            <a href="/9" className="text-stone-500 hover:text-stone-900">Retro</a>
            <a href="/10" className="text-stone-500 hover:text-stone-900">Zen</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Headline */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-stone-900 leading-tight mb-2">
            Schema Inference Engine<br />Now Available to Public
          </h2>
          <p className="font-serif text-stone-600 italic">
            Revolutionary technology transforms SQL queries into visual data representations
          </p>
          <div className="w-24 h-0.5 bg-stone-900 mx-auto mt-4" />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Query Input - takes 2 columns */}
          <section className="md:col-span-2">
            <div className="border-2 border-stone-900 p-4 bg-white/50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-300">
                <h3 className="font-serif font-bold text-lg uppercase tracking-wide">Query Editor</h3>
                <div className="flex items-center gap-3 text-sm">
                  <label className="text-stone-600 font-serif">
                    Rows:
                    <input
                      type="number"
                      value={rowCount}
                      onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 ml-2 px-2 py-0.5 border border-stone-400 bg-transparent text-center font-mono text-sm focus:outline-none"
                      min={1}
                      max={100}
                    />
                  </label>
                  <button
                    onClick={handleRun}
                    disabled={isLoading || !sql.trim()}
                    className="px-4 py-1.5 bg-stone-900 text-[#f5f1e8] font-serif text-sm uppercase tracking-wider hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="w-full min-h-[200px] p-3 bg-white/80 text-stone-800 font-mono text-sm resize-none border border-stone-300 focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
                spellCheck={false}
              />
              <p className="text-xs text-stone-500 mt-2 font-serif italic">
                Press ⌘+Enter to execute query
              </p>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="md:col-span-1">
            <div className="border-l-2 border-stone-900 pl-4">
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider text-stone-600 mb-3">
                Quick Reference
              </h4>
              <div className="font-serif text-sm text-stone-600 space-y-3">
                <p>
                  <strong>SELECT</strong> queries are automatically analyzed for table structures and relationships.
                </p>
                <p>
                  <strong>Primary keys</strong> (*) are inferred from columns named "id".
                </p>
                <p>
                  <strong>Foreign keys</strong> (†) are detected from "*_id" patterns.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 p-4 border-l-4 border-red-700 bg-red-50 font-serif text-red-800">
            <strong>BREAKING:</strong> {error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <div className="mt-12 pt-8 border-t-2 border-stone-900">
            <h3 className="font-serif text-2xl font-bold text-center mb-8 uppercase tracking-wider">
              — Analysis Results —
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Schema */}
              {schema && (
                <section>
                  <h4 className="font-serif text-xl font-bold border-b-2 border-stone-900 pb-1 mb-4 uppercase">
                    Schema Structure
                  </h4>
                  {schema.tables.map((table: TableSchema) => (
                    <NewspaperTable key={table.name} table={table} />
                  ))}

                  {schema.relationships && schema.relationships.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-stone-300">
                      <h5 className="font-serif font-bold text-sm uppercase tracking-wider text-stone-600 mb-2">
                        Table Relationships
                      </h5>
                      <div className="font-serif text-sm text-stone-600 space-y-1">
                        {schema.relationships.map((rel, i) => (
                          <p key={i}>
                            {rel.LeftTable}.{rel.LeftColumn} → {rel.RightTable}.{rel.RightColumn}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Data */}
              {data && (
                <section>
                  <h4 className="font-serif text-xl font-bold border-b-2 border-stone-900 pb-1 mb-4 uppercase">
                    Generated Data
                  </h4>
                  {Object.entries(data).map(([tableName, rows]) => (
                    <NewspaperDataTable key={tableName} tableName={tableName} rows={rows} />
                  ))}
                </section>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="mt-12 text-center py-12 border-t border-b border-stone-300">
            <p className="font-serif text-xl text-stone-500 italic">
              Enter a SQL query above to begin analysis
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-stone-900 mt-12 bg-[#f5f1e8]">
        <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-center font-serif text-xs text-stone-500">
          <span>© 2024 The Seeql Times. All Rights Reserved.</span>
          <span>View 7 of 10</span>
        </div>
      </footer>
    </div>
  );
}
