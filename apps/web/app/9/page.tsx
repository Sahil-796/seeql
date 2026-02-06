"use client";

import { useState, useEffect } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema, TableSchema, ColumnSchema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT 
  f.filename, f.size_kb, f.created,
  d.path, d.permissions
FROM files f
JOIN directories d ON f.dir_id = d.id
WHERE f.size_kb > 100`;

function RetroTable({ table }: { table: TableSchema }) {
  return (
    <div className="border border-amber-500/60 bg-black/50 p-4">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-amber-500/30">
        <span className="text-amber-400">[</span>
        <span className="text-amber-300 font-bold">{table.name.toUpperCase()}</span>
        <span className="text-amber-400">]</span>
        <span className="text-amber-500/60 text-xs ml-auto">{table.columns.length} fields</span>
      </div>
      <div className="space-y-1">
        {table.columns.map((col: ColumnSchema, i) => (
          <div key={col.name} className="flex items-center gap-2 text-sm">
            <span className="text-amber-600/60 w-4">{i + 1}.</span>
            <span className="text-amber-200 flex-1">{col.name}</span>
            <span className="text-amber-500/50 text-xs">{col.type || "CHAR"}</span>
            {col.is_primary && <span className="text-amber-400 text-xs">&lt;PK&gt;</span>}
            {col.is_foreign && <span className="text-amber-400 text-xs">&lt;FK&gt;</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RetroDataTable({ tableName, rows }: { tableName: string; rows: Record<string, unknown>[] }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="border border-amber-500/60 bg-black/50 overflow-hidden">
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex justify-between items-center">
        <span className="text-amber-300 font-bold">{tableName.toUpperCase()}.DAT</span>
        <span className="text-amber-500/60 text-xs">{rows.length} RECORDS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-500/20">
              {columns.map((col) => (
                <th key={col} className="text-left text-amber-400 px-3 py-2 text-xs">
                  {col.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-amber-500/10 hover:bg-amber-500/5">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-amber-200/80">
                    {row[col] === null ? (
                      <span className="text-amber-500/40">NULL</span>
                    ) : (
                      <span className="truncate block max-w-[140px]">{String(row[col])}</span>
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

export default function RetroView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [bootText, setBootText] = useState("");

  const fullBootText = "SEEQL DATABASE SYSTEM v3.1\nCopyright (c) 1987 SEEQL Corp.\nAll rights reserved.\n\n640K RAM OK\nLoading SQL Parser... OK\nInitializing Schema Engine... OK\n\nReady.";

  useEffect(() => {
    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);

    // Boot sequence
    let i = 0;
    const bootInterval = setInterval(() => {
      if (i <= fullBootText.length) {
        setBootText(fullBootText.slice(0, i));
        i++;
      } else {
        clearInterval(bootInterval);
      }
    }, 15);

    return () => {
      clearInterval(cursorInterval);
      clearInterval(bootInterval);
    };
  }, []);

  const handleRun = () => {
    if (sql.trim()) {
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1400] text-amber-300 font-mono relative overflow-hidden">
      {/* CRT effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.15),
              rgba(0, 0, 0, 0.15) 1px,
              transparent 1px,
              transparent 2px
            )
          `,
        }}
      />
      
      {/* Screen glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        boxShadow: "inset 0 0 150px rgba(255, 176, 0, 0.1)",
      }} />

      {/* Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-amber-500/40 px-4 py-2 bg-amber-500/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-amber-400">╔══╗</span>
            <span className="text-amber-200 font-bold">SEEQL</span>
            <span className="text-amber-400">╚══╝</span>
            <span className="text-amber-500/60 text-xs">v3.1</span>
          </div>

          <nav className="flex gap-4 text-xs">
            <a href="/1" className="text-amber-500/50 hover:text-amber-300">[F1]EDIT</a>
            <a href="/2" className="text-amber-500/50 hover:text-amber-300">[F2]TERM</a>
            <a href="/6" className="text-amber-500/50 hover:text-amber-300">[F6]BLUE</a>
            <a href="/7" className="text-amber-500/50 hover:text-amber-300">[F7]NEWS</a>
            <a href="/8" className="text-amber-500/50 hover:text-amber-300">[F8]HAUS</a>
            <a href="/9" className="text-amber-300 bg-amber-500/20 px-2">[F9]RETRO</a>
            <a href="/10" className="text-amber-500/50 hover:text-amber-300">[F10]ZEN</a>
          </nav>
        </div>
      </header>

      {/* Boot Text */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-4 text-xs text-amber-500/70 whitespace-pre-line">
        {bootText}
        {bootText.length < fullBootText.length && (
          <span className={cursorVisible ? "opacity-100" : "opacity-0"}>█</span>
        )}
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-8">
        {/* Query Input */}
        <section className="mb-6">
          <div className="border border-amber-500/40 bg-black/30">
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
              <span className="text-amber-400 text-sm">SQL QUERY EDITOR</span>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500/60">ROWS:</span>
                  <input
                    type="number"
                    value={rowCount}
                    onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 px-2 py-1 bg-black border border-amber-500/40 text-amber-300 text-center focus:outline-none focus:border-amber-400"
                    min={1}
                    max={100}
                  />
                </div>
                <button
                  onClick={handleRun}
                  disabled={isLoading || !sql.trim()}
                  className="px-4 py-1 bg-amber-500/20 border border-amber-500/60 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "RUNNING..." : "[ENTER] RUN"}
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 select-none">A:\&gt;</span>
                <div className="flex-1 relative">
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
                    className="w-full min-h-[150px] bg-transparent text-amber-200 resize-none focus:outline-none placeholder:text-amber-500/30 caret-amber-400"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-2 bg-amber-500/5 border-t border-amber-500/20 text-xs text-amber-500/50 flex justify-between">
              <span>Ctrl+Enter to execute</span>
              <span>INS | LINE 1 COL 1</span>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 border border-red-500/60 bg-red-900/20 text-red-400 text-sm">
            <span className="font-bold mr-2">ERROR:</span>{error}
          </div>
        )}

        {/* Results */}
        {(schema || data) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schema */}
            {schema && (
              <section>
                <div className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                  <span>╔═</span>
                  <span>SCHEMA STRUCTURE</span>
                  <span>═╗</span>
                </div>
                <div className="space-y-4">
                  {schema.tables.map((table: TableSchema) => (
                    <RetroTable key={table.name} table={table} />
                  ))}
                </div>

                {schema.relationships && schema.relationships.length > 0 && (
                  <div className="mt-4 p-4 border border-amber-500/30 border-dashed">
                    <div className="text-amber-400 text-xs mb-2">RELATIONSHIPS:</div>
                    <div className="space-y-1 text-sm">
                      {schema.relationships.map((rel, i) => (
                        <div key={i} className="text-amber-300/70">
                          {rel.LeftTable}.{rel.LeftColumn} ──► {rel.RightTable}.{rel.RightColumn}
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
                <div className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                  <span>╔═</span>
                  <span>QUERY RESULTS</span>
                  <span>═╗</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(data).map(([tableName, rows]) => (
                    <RetroDataTable key={tableName} tableName={tableName} rows={rows} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!schema && !data && !error && (
          <div className="text-center py-12">
            <div className="text-amber-500/40 text-sm">
              ╔════════════════════════════════╗<br />
              ║                                ║<br />
              ║   ENTER SQL QUERY TO BEGIN     ║<br />
              ║                                ║<br />
              ╚════════════════════════════════╝
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-amber-500/40 bg-amber-500/10 px-4 py-1 text-xs">
        <div className="max-w-5xl mx-auto flex justify-between text-amber-500/60">
          <span>SEEQL DATABASE SYSTEM</span>
          <span>MEM: 640K FREE</span>
          <span>VIEW 09/10</span>
        </div>
      </footer>
    </div>
  );
}
