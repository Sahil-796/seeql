"use client";

import { useState, useEffect } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  h.id, h.alias, h.reputation,
  m.content, m.encrypted, m.sent_at
FROM hackers h
JOIN messages m ON h.id = m.sender_id
WHERE h.reputation > 9000`;

function GlitchText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <span 
        className="absolute inset-0 text-cyan-400 animate-glitch-1 opacity-80" 
        aria-hidden="true"
      >
        {children}
      </span>
      <span 
        className="absolute inset-0 text-pink-500 animate-glitch-2 opacity-80" 
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );
}

function NeonBorder({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Neon glow layers */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-lg opacity-75 blur-sm" />
      <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-lg opacity-50" />
      <div className="relative bg-slate-950 rounded-lg">{children}</div>
    </div>
  );
}

function CyberTable({ table }: { table: TableSchema }) {
  return (
    <NeonBorder className="mb-6">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-cyan-500/30">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold clip-corners">
              {table.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 to-purple-600 blur-md opacity-50 -z-10" />
          </div>
          <div>
            <h3 className="text-cyan-300 font-mono text-lg tracking-wider">{table.name.toUpperCase()}</h3>
            <p className="text-pink-400/60 text-xs font-mono">
              [{table.columns.length}] FIELDS DETECTED
            </p>
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-1 font-mono text-sm">
          {table.columns.map((col: ColumnSchema, i) => (
            <div
              key={col.name}
              className="flex items-center justify-between py-2 px-3 -mx-3 hover:bg-cyan-500/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-purple-400/50 text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-cyan-200 group-hover:text-cyan-100 transition-colors">
                  {col.name}
                </span>
                {col.is_primary && (
                  <span className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 font-bold tracking-wider">
                    PK
                  </span>
                )}
                {col.is_foreign && (
                  <span className="px-2 py-0.5 text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/40 font-bold tracking-wider">
                    FK
                  </span>
                )}
              </div>
              <span className="text-purple-400/60 text-xs">{col.type || "varchar"}</span>
            </div>
          ))}
        </div>
      </div>
    </NeonBorder>
  );
}

function CyberDataTable({ 
  tableName, 
  rows 
}: { 
  tableName: string; 
  rows: Record<string, unknown>[] 
}) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <NeonBorder className="mb-6">
      <div className="overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-950/50 via-purple-950/50 to-pink-950/50 border-b border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-cyan-300 tracking-wider">
              <span className="text-pink-400">&gt;</span> {tableName.toUpperCase()}
            </h3>
            <span className="font-mono text-xs text-purple-400">
              [{rows.length}] RECORDS
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="bg-slate-900/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left text-xs text-cyan-500/70 px-4 py-3 uppercase tracking-wider border-b border-cyan-500/20"
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
                  className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-cyan-100/80">
                      {row[col] === null ? (
                        <span className="text-pink-500/50">NULL</span>
                      ) : (
                        <span className="truncate block max-w-[180px]">{String(row[col])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 10 && (
          <div className="px-5 py-3 text-center text-xs text-purple-400/60 border-t border-cyan-500/20 font-mono">
            ... {rows.length - 10} MORE RECORDS HIDDEN
          </div>
        )}
      </div>
    </NeonBorder>
  );
}

export default function NeonView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);
  const [scanLine, setScanLine] = useState(0);

  // Animated scan line effect
  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* CRT scan lines effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.3) 2px,
            rgba(0, 0, 0, 0.3) 4px
          )`,
        }}
      />
      
      {/* Animated scan line */}
      <div 
        className="fixed left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-50"
        style={{ top: `${scanLine}%` }}
      />

      {/* Grid background */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <GlitchText className="font-mono text-2xl font-bold tracking-widest">SEEQL</GlitchText>
            </div>
            <span className="text-xs font-mono text-pink-500/60 tracking-wider">// NEURAL_LINK v2.0</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex gap-4 font-mono text-xs tracking-wider">
              <a href="/1" className="text-cyan-500/50 hover:text-cyan-400 transition-colors px-3 py-1">[01]EDIT</a>
              <a href="/2" className="text-cyan-500/50 hover:text-cyan-400 transition-colors px-3 py-1">[02]TERM</a>
              <a href="/3" className="text-cyan-500/50 hover:text-cyan-400 transition-colors px-3 py-1">[03]SOFT</a>
              <a href="/4" className="text-cyan-500/50 hover:text-cyan-400 transition-colors px-3 py-1">[04]LUXE</a>
              <a href="/5" className="text-cyan-400 border border-cyan-500/50 px-3 py-1 shadow-[0_0_10px_rgba(0,255,255,0.3)]">[05]NEON</a>
            </nav>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="inline-block mb-6 px-4 py-1 border border-pink-500/40 text-pink-400 font-mono text-xs tracking-[0.3em]">
          SYSTEM ONLINE
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 relative">
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            QUERY_MATRIX
          </span>
        </h1>
        <p className="font-mono text-cyan-500/60 max-w-lg mx-auto text-sm tracking-wide">
          &gt; INITIALIZE SCHEMA INFERENCE PROTOCOL
          <br />
          &gt; ACTIVATE DATA SYNTHESIS ENGINE
        </p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        {/* Query Input */}
        <section className="mb-12">
          <NeonBorder>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse" />
                  <span className="font-mono text-sm text-cyan-400 tracking-wider">INPUT_TERMINAL</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">ROWS:</span>
                    <input
                      type="number"
                      value={rowCount}
                      onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 px-2 py-1 bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-center focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                      min={1}
                      max={100}
                    />
                  </div>
                  <button
                    onClick={handleRun}
                    disabled={isLoading || !sql.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-mono tracking-wider hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        PROCESSING
                      </span>
                    ) : (
                      "EXECUTE"
                    )}
                  </button>
                </div>
              </div>

              {/* Code Input */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-slate-900/50 border-r border-cyan-500/20 flex flex-col items-center pt-4 font-mono text-xs text-cyan-500/30">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="h-6 flex items-center">{i + 1}</div>
                  ))}
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
                  className="w-full min-h-[240px] pl-14 pr-4 py-4 bg-slate-900/80 text-cyan-100 font-mono text-sm resize-none border-0 focus:outline-none placeholder:text-cyan-800 leading-6"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between mt-4 font-mono text-xs text-cyan-500/40">
                <span>&gt; CTRL+ENTER TO EXECUTE</span>
                <span>STATUS: {isLoading ? "PROCESSING" : "READY"}</span>
              </div>
            </div>
          </NeonBorder>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-8 p-5 bg-red-950/30 border border-red-500/50 font-mono text-sm">
            <span className="text-red-400 animate-pulse mr-2">[ERROR]</span>
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Results Grid */}
        {(schema || data) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Schema */}
            {schema && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 bg-cyan-400 animate-pulse" />
                  <h2 className="font-mono text-lg text-cyan-400 tracking-wider">SCHEMA_ANALYSIS</h2>
                </div>
                {schema.tables.map((table: TableSchema) => (
                  <CyberTable key={table.name} table={table} />
                ))}

                {schema.relationships && schema.relationships.length > 0 && (
                  <NeonBorder>
                    <div className="p-5">
                      <h3 className="font-mono text-sm text-pink-400 mb-4 tracking-wider">&gt; NEURAL_LINKS</h3>
                      <div className="space-y-2 font-mono text-sm">
                        {schema.relationships.map((rel, i) => (
                          <div key={i} className="flex items-center gap-3 text-cyan-300/80">
                            <span className="text-purple-400">[{String(i + 1).padStart(2, "0")}]</span>
                            <span>{rel.LeftTable}.{rel.LeftColumn}</span>
                            <span className="text-pink-400">{"→→→"}</span>
                            <span>{rel.RightTable}.{rel.RightColumn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </NeonBorder>
                )}
              </section>
            )}

            {/* Data */}
            {data && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 bg-pink-400 animate-pulse" />
                  <h2 className="font-mono text-lg text-pink-400 tracking-wider">DATA_SYNTHESIS</h2>
                </div>
                {Object.entries(data).map(([tableName, rows]) => (
                  <CyberDataTable key={tableName} tableName={tableName} rows={rows} />
                ))}
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 border-2 border-cyan-500/30 flex items-center justify-center relative">
              <div className="absolute inset-0 border-2 border-cyan-500/20 animate-ping" />
              <div className="w-12 h-12 border-2 border-dashed border-cyan-500/40 animate-spin-slow" />
            </div>
            <p className="font-mono text-cyan-500/50 tracking-wider">
              &gt; AWAITING_INPUT...
              <span className="animate-pulse">_</span>
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/20 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-mono text-xs text-cyan-500/40">
          <span>&copy; 2084 SEEQL_CORP // ALL_RIGHTS_RESERVED</span>
          <span>VIEW [05/05] // NEON_PROTOCOL</span>
        </div>
      </footer>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes glitch-1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(2px, -2px); }
          60% { clip-path: inset(60% 0 20% 0); transform: translate(-1px, 1px); }
          80% { clip-path: inset(80% 0 5% 0); transform: translate(1px, -1px); }
        }
        @keyframes glitch-2 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(1px, -1px); }
          80% { clip-path: inset(40% 0 40% 0); transform: translate(-1px, 1px); }
        }
        .animate-glitch-1 {
          animation: glitch-1 2s infinite linear;
        }
        .animate-glitch-2 {
          animation: glitch-2 2s infinite linear;
          animation-delay: 0.1s;
        }
        .clip-corners {
          clip-path: polygon(0 10%, 10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%);
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
