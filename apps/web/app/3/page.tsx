"use client";

import { useState } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  customers.name,
  customers.email,
  products.title,
  products.price
FROM customers
JOIN orders ON customers.id = orders.customer_id
JOIN products ON orders.product_id = products.id`;

function FloatingBlob({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-30 animate-blob ${className}`}
    />
  );
}

function TableCard({ table }: { table: TableSchema }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg shadow-sage-200/50 border border-sage-100 hover:shadow-xl hover:shadow-sage-200/60 transition-all duration-500 hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-400 to-sage-500 flex items-center justify-center text-white text-lg">
          {table.name.charAt(0).toUpperCase()}
        </div>
        <h3 className="text-lg font-semibold text-sage-900">{table.name}</h3>
      </div>
      <div className="space-y-2">
        {table.columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-sage-50/80 group hover:bg-sage-100/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sage-700">{col.name}</span>
              {col.is_primary && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700 font-medium">
                  Primary
                </span>
              )}
              {col.is_foreign && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-sky-100 text-sky-700 font-medium">
                  FK
                </span>
              )}
            </div>
            <span className="text-xs text-sage-400">{col.type || "text"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaView({ schema }: { schema: Schema }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {schema.tables.map((table) => (
        <TableCard key={table.name} table={table} />
      ))}
    </div>
  );
}

function DataCard({ tableName, rows }: { tableName: string; rows: Record<string, unknown>[] }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg shadow-sage-200/50 border border-sage-100">
      <div className="px-6 py-4 bg-gradient-to-r from-sage-100 to-peach-100 border-b border-sage-100/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sage-900">{tableName}</h3>
          <span className="text-xs text-sage-500 bg-white/60 px-3 py-1 rounded-full">
            {rows.length} rows
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-sage-50/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left text-xs font-medium text-sage-500 px-4 py-3 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sage-100/50">
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="hover:bg-sage-50/30 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-sm text-sage-700">
                    <span className="truncate block max-w-[180px]">
                      {row[col] === null ? (
                        <span className="text-sage-300 italic">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="px-6 py-3 bg-sage-50/30 text-center text-xs text-sage-400">
          Showing 10 of {rows.length} rows
        </div>
      )}
    </div>
  );
}

export default function OrganicView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);
  const [activeTab, setActiveTab] = useState<"schema" | "data">("schema");

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-peach-50 text-sage-900 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingBlob className="w-[600px] h-[600px] bg-sage-300 -top-48 -left-48 animation-delay-0" />
        <FloatingBlob className="w-[500px] h-[500px] bg-peach-300 top-1/2 -right-48 animation-delay-2000" />
        <FloatingBlob className="w-[400px] h-[400px] bg-lavender-300 bottom-0 left-1/3 animation-delay-4000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 8h6M9 16h3" />
              </svg>
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-sage-700 to-sage-500 bg-clip-text text-transparent">
              Seeql
            </span>
          </div>
          
          <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm">
            {[
              { href: "/1", label: "Editorial" },
              { href: "/2", label: "Terminal" },
              { href: "/3", label: "Organic", active: true },
              { href: "/4", label: "Luxury" },
              { href: "/5", label: "Neon" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  item.active
                    ? "bg-white shadow-sm text-sage-900 font-medium"
                    : "text-sage-500 hover:text-sage-700"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-sage-800 via-sage-600 to-peach-600 bg-clip-text text-transparent">
            Visualize Your Data
          </h1>
          <p className="text-sage-500 text-lg max-w-lg mx-auto">
            Write a SQL query and watch as we infer the schema and generate beautiful mock data
          </p>
        </div>

        {/* Query Input */}
        <div className="bg-white/70 backdrop-blur-sm rounded-[2rem] p-8 shadow-xl shadow-sage-200/40 border border-white/50 mb-12">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-sage-700">Your SQL Query</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-sage-500">
                <span>Rows:</span>
                <input
                  type="number"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-1.5 rounded-xl bg-sage-50 border-0 text-center focus:outline-none focus:ring-2 focus:ring-sage-300"
                  min={1}
                  max={100}
                />
              </div>
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-sage-500 to-sage-600 text-white rounded-xl font-medium shadow-lg shadow-sage-300/50 hover:shadow-xl hover:shadow-sage-300/60 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </span>
                ) : (
                  "Run Query"
                )}
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
            className="w-full min-h-[160px] p-5 rounded-2xl bg-sage-50/80 text-sage-800 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-sage-300 placeholder:text-sage-300 transition-all"
            spellCheck={false}
          />
          
          <p className="text-xs text-sage-400 mt-3 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-sage-100 font-mono">Cmd</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-sage-100 font-mono">Enter</kbd> to run
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-5 bg-red-50/80 backdrop-blur-sm rounded-2xl border border-red-100 text-red-600 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Results Tabs */}
        {(schema || data) && (
          <div className="mb-8">
            <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl w-fit mx-auto shadow-sm">
              <button
                onClick={() => setActiveTab("schema")}
                className={`px-6 py-2.5 rounded-xl text-sm transition-all ${
                  activeTab === "schema"
                    ? "bg-white shadow-sm text-sage-900 font-medium"
                    : "text-sage-500 hover:text-sage-700"
                }`}
              >
                Schema
                {schema && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-sage-100 text-xs">
                    {schema.tables.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("data")}
                className={`px-6 py-2.5 rounded-xl text-sm transition-all ${
                  activeTab === "data"
                    ? "bg-white shadow-sm text-sage-900 font-medium"
                    : "text-sage-500 hover:text-sage-700"
                }`}
              >
                Generated Data
                {data && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-peach-100 text-xs">
                    {Object.keys(data).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Schema View */}
        {activeTab === "schema" && schema && <SchemaView schema={schema} />}

        {/* Data View */}
        {activeTab === "data" && data && (
          <div className="space-y-6">
            {Object.entries(data).map(([tableName, rows]) => (
              <DataCard key={tableName} tableName={tableName} rows={rows} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-sage-100 to-peach-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6M9 8h6M9 16h3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-sage-700 mb-2">Ready to explore</h3>
            <p className="text-sage-400">Enter a SQL query above to see the magic happen</p>
          </div>
        )}
      </main>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
