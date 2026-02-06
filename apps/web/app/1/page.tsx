"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import { SQLEditor, SchemaVisualizer, MultiTableData } from "@/components";

const EXAMPLE_QUERY = `SELECT 
  u.id, u.name, u.email,
  o.id as order_id, o.total, o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 100`;

export default function EditorialView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1a1a]">
      {/* Header */}
      <header className="border-b border-[#e8e6e3] px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Seeql</h1>
            <p className="text-sm text-[#6b6b6b] mt-1 tracking-wide">
              Query visualization made simple
            </p>
          </div>
          <nav className="flex gap-8 text-sm">
            <a href="/1" className="text-[#1a1a1a] border-b border-[#1a1a1a] pb-0.5">Editorial</a>
            <a href="/2" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Terminal</a>
            <a href="/3" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Organic</a>
            <a href="/4" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Luxury</a>
            <a href="/5" className="text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors">Neon</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Query Section */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#9a9a9a] block mb-2">
                01 — Query
              </span>
              <h2 className="font-serif text-2xl">Write your SQL</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#6b6b6b]">Rows per table</label>
                <input
                  type="number"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-sm border border-[#e8e6e3] bg-transparent focus:outline-none focus:border-[#1a1a1a] transition-colors"
                  min={1}
                  max={100}
                />
              </div>
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                className="px-6 py-2.5 bg-[#1a1a1a] text-[#faf9f7] text-sm tracking-wide hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? "Running..." : "Execute Query"}
              </button>
            </div>
          </div>

          <div className="relative">
            <SQLEditor
              value={sql}
              onChange={setSql}
              onSubmit={handleRun}
              placeholder={EXAMPLE_QUERY}
              autoFocus
              className="w-full min-h-[180px] p-6 bg-white border border-[#e8e6e3] text-[15px] leading-relaxed focus:outline-none focus:border-[#1a1a1a] transition-colors placeholder:text-[#c4c4c4]"
            />
            <div className="absolute bottom-3 right-3 text-xs text-[#9a9a9a]">
              ⌘ + Enter to execute
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
        </section>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Schema Panel */}
          <section className="lg:col-span-1">
            <span className="text-xs uppercase tracking-[0.2em] text-[#9a9a9a] block mb-2">
              02 — Schema
            </span>
            <h2 className="font-serif text-2xl mb-6">Inferred Structure</h2>

            {schema ? (
              <SchemaVisualizer
                schema={schema}
                tableClassName="bg-white border border-[#e8e6e3] p-5 mb-4"
                columnClassName="py-2 border-b border-[#f0efed] last:border-0 text-sm"
              />
            ) : (
              <div className="bg-white border border-[#e8e6e3] p-8 text-center text-[#9a9a9a] text-sm">
                Run a query to see the inferred schema
              </div>
            )}
          </section>

          {/* Data Panel */}
          <section className="lg:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#9a9a9a] block mb-2">
              03 — Data
            </span>
            <h2 className="font-serif text-2xl mb-6">Generated Results</h2>

            {data ? (
              <MultiTableData
                data={data}
                className="bg-white border border-[#e8e6e3]"
                tableWrapperClassName="p-5"
                headerClassName="border-b border-[#e8e6e3] bg-[#faf9f7] text-xs uppercase tracking-wider text-[#6b6b6b]"
                cellClassName="border-b border-[#f0efed] text-sm"
              />
            ) : (
              <div className="bg-white border border-[#e8e6e3] p-8 text-center text-[#9a9a9a] text-sm">
                Generated data will appear here
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e6e3] mt-20 px-8 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-[#9a9a9a]">
          <span>Seeql — SQL Playground & Schema Visualizer</span>
          <span>View 1 of 5 — Editorial</span>
        </div>
      </footer>
    </div>
  );
}
