"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components";
import { useSeeql } from "@/lib/hooks";
import type { Schema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id`;

function TerminalPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#39ff14] select-none text-base">{">"}</span>
      <span className="text-base">{children}</span>
    </div>
  );
}

function SchemaBlock({ schema }: { schema: Schema }) {
  return (
    <div className="font-mono text-sm">
      {schema.tables.map((table) => (
        <div key={table.name} className="mb-4">
          <div className="text-[#ff6b6b]">
            CREATE TABLE {table.name} {"{"}
          </div>
          {table.columns.map((col) => (
            <div key={col.name} className="pl-4 text-[#ccc]">
              <span className="text-[#ffd93d]">{col.name}</span>
              <span className="text-[#666]"> : </span>
              <span className="text-[#6bcb77]">{col.type || "TEXT"}</span>
              {col.is_primary && <span className="text-[#ff6b6b]"> [PK]</span>}
              {col.is_foreign && (
                <span className="text-[#4d96ff]">
                  {" "}
                  [FK → {col.ref_table}.{col.ref_column}]
                </span>
              )}
            </div>
          ))}
          <div className="text-[#ff6b6b]">{"}"}</div>
        </div>
      ))}
      {schema.relationships && schema.relationships.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <div className="text-[#666] mb-2">{"// RELATIONSHIPS"}</div>
          {schema.relationships.map((rel) => (
            <div
              key={`${rel.LeftTable}.${rel.LeftColumn}-${rel.RightTable}.${rel.RightColumn}`}
              className="text-[#4d96ff]"
            >
              {rel.LeftTable}.{rel.LeftColumn} {"===>"} {rel.RightTable}.
              {rel.RightColumn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TerminalView() {
  const {
    sql,
    schema,
    data,
    columns,
    rows,
    rowCount: resultRowCount,
    isLoading,
    error,
    setSql,
    runQuery,
  } = useSeeql();
  const [rowCount, setRowCount] = useState(10);
  const [history, setHistory] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [isQuickRefOpen, setIsQuickRefOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRun = () => {
    if (sql.trim()) {
      setHistory((prev) => [...prev.slice(-4), sql.trim()]);
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ccc] font-mono">
      {/* Terminal Header */}
      <header className="bg-[#1a1a1a] border-b-2 border-[#39ff14] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[#39ff14] text-base font-bold tracking-wider">
            SEEQL_TERMINAL v1.0
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-[#39ff14]">{time}</span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Main Terminal Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Output Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Welcome Message */}
            {!sql.trim() && (
              <div className="text-[#666] text-sm border border-[#333] p-4 bg-[#111]">
                <pre className="text-base">{`
  ____  _____ _____ ___  _     
 / ___|| ____| ____/ _ \\| |    
 \\___ \\|  _| |  _|| | | | |    
  ___) | |___| |__| |_| | |___ 
 |____/|_____|_____\\__\\_\\_____|
                                
 SQL Playground & Schema Visualizer
 Type your query below and press ENTER or click [EXECUTE]
              `}</pre>
              </div>
            )}

            {/* History */}
            {history.map((cmd) => (
              <TerminalPrompt key={cmd}>
                <span className="text-[#666]">{cmd}</span>
              </TerminalPrompt>
            ))}

            {/* Error Output */}
            {error && (
              <div className="text-[#ff6b6b] bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 p-4 text-sm">
                <span className="font-bold">ERROR:</span> {error}
              </div>
            )}

            {(schema || (rows && rows.length > 0)) && (
              <div className="flex items-center justify-between gap-4 border border-[#333] bg-[#111] px-5 py-3">
                <div className="text-[#39ff14] text-sm">
                  ▓▓▓ RESULTS LAYOUT ▓▓▓
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSplitView(false)}
                    className={`px-3 py-1 text-xs border border-[#333] transition-colors ${
                      !isSplitView
                        ? "bg-[#39ff14] text-[#0d0d0d]"
                        : "text-[#999] hover:text-[#e5e5e5]"
                    }`}
                  >
                    STACKED
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSplitView(true)}
                    className={`px-3 py-1 text-xs border border-[#333] transition-colors ${
                      isSplitView
                        ? "bg-[#39ff14] text-[#0d0d0d]"
                        : "text-[#999] hover:text-[#e5e5e5]"
                    }`}
                  >
                    SIDE BY SIDE
                  </button>
                </div>
              </div>
            )}

            <div
              className={`grid gap-4 ${isSplitView ? "lg:grid-cols-2" : "grid-cols-1"}`}
            >
              {/* Schema Output */}
              {schema && (
                <div className="border border-[#333] bg-[#111] p-5">
                  <div className="text-[#39ff14] text-sm mb-3 pb-2 border-b border-[#333]">
                    ▓▓▓ INFERRED SCHEMA ▓▓▓
                  </div>
                  <SchemaBlock schema={schema} />
                </div>
              )}

              {/* Data Output */}
              {data && Object.keys(data).length > 0 && (
                <div className="border border-[#333] bg-[#111] p-5">
                  <div className="text-[#39ff14] text-sm mb-3 pb-2 border-b border-[#333]">
                    ▓▓▓ GENERATED DATA ▓▓▓
                  </div>
                  <div className="space-y-6">
                    {Object.entries(data).map(([tableName, tableRows]) => (
                      <DataTable
                        key={tableName}
                        data={tableRows}
                        tableName={tableName}
                        maxRows={15}
                        className="rounded-lg border border-[#2a2a2a] bg-[#0f0f10]"
                        tableClassName="border-separate border-spacing-0"
                        captionClassName="text-[#666]"
                        cellClassName="border border-[#2a2a2a] text-[#cfcfcf]"
                        getRowKey={(row, index) =>
                          String(
                            row.id ??
                              row.ID ??
                              row.Id ??
                              `${tableName}-${index}`,
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Query Results */}
              {rows && rows.length > 0 && (
                <div className="border border-[#333] bg-[#111] p-5">
                  <div className="text-[#39ff14] text-sm mb-3 pb-2 border-b border-[#333]">
                    ▓▓▓ QUERY RESULTS{" "}
                    {resultRowCount ? `(${resultRowCount} rows)` : ""} ▓▓▓
                  </div>
                  {columns && (
                    <div className="text-[#666] text-xs mb-2">
                      Columns: {columns.join(", ")}
                    </div>
                  )}
                  <DataTable
                    data={rows}
                    tableName=""
                    maxRows={15}
                    className="rounded-lg border border-[#2a2a2a] bg-[#0f0f10]"
                    tableClassName="border-separate border-spacing-0"
                    captionClassName="text-[#666]"
                    cellClassName="border border-[#2a2a2a] text-[#cfcfcf]"
                    getRowKey={(row, index) =>
                      String(row.id ?? row.ID ?? row.Id ?? `result-${index}`)
                    }
                  />
                </div>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-[#39ff14] animate-pulse text-base">
                Processing query...
                <span className="animate-ping inline-block ml-1">_</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-[#333] bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-3 text-sm text-[#666]">
              <span>ROWS_PER_TABLE:</span>
              <input
                type="number"
                value={rowCount}
                onChange={(e) =>
                  setRowCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-14 bg-transparent border border-[#333] px-2 py-1 text-[#39ff14] text-sm focus:outline-none focus:border-[#39ff14]"
                min={1}
                max={100}
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#39ff14] pt-2 text-lg">{">"}</span>
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
                className="flex-1 bg-transparent resize-none text-[#fff] text-base placeholder:text-[#444] focus:outline-none min-h-[80px]"
                rows={3}
              />
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                type="button"
                className="px-5 py-2.5 bg-[#39ff14] text-[#0d0d0d] text-sm font-bold hover:bg-[#2ee00d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                [EXECUTE]
              </button>
            </div>
            <div className="text-sm text-[#444] mt-3">
              Press Ctrl+Enter to execute | Tab to indent
            </div>
          </div>
        </main>

        {/* Side Panel - Quick Reference */}
        <button
          type="button"
          onClick={() => setIsQuickRefOpen((open) => !open)}
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l border border-[#333] bg-[#0a0a0a] px-3 py-2 text-xs text-[#39ff14] shadow-lg"
        >
          {isQuickRefOpen ? "HIDE" : "HELP"}
        </button>
        <aside
          className={`fixed right-0 top-[56px] z-30 h-[calc(100vh-56px)] w-72 border-l-2 border-[#333] bg-[#0a0a0a] p-5 text-sm overflow-y-auto transition-transform ${
            isQuickRefOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="text-[#39ff14] font-bold mb-4 text-base">
            {"// QUICK REFERENCE"}
          </div>

          <div className="space-y-5 text-[#666]">
            <div>
              <div className="text-[#ffd93d] mb-2">Supported Queries:</div>
              <div>- SELECT with JOINs</div>
              <div>- Multiple tables</div>
              <div>- Column aliases</div>
            </div>

            <div>
              <div className="text-[#ffd93d] mb-2">Auto-Detection:</div>
              <div>- Primary keys (id)</div>
              <div>- Foreign keys (*_id)</div>
              <div>- Relationships</div>
            </div>

            <div>
              <div className="text-[#ffd93d] mb-2">Example:</div>
              <pre className="text-[#4d96ff] whitespace-pre-wrap text-sm">
                {`SELECT
  u.name,
  p.title
 FROM users u
 JOIN posts p
 ON u.id = p.user_id`}
              </pre>
            </div>

            <div className="pt-4 border-t border-[#333]">
              <div className="text-[#ff6b6b]">STATUS:</div>
              <div className={schema ? "text-[#27c93f]" : "text-[#666]"}>
                SCHEMA: {schema ? "LOADED" : "EMPTY"}
              </div>
              <div className={data ? "text-[#27c93f]" : "text-[#666]"}>
                DATA: {data ? `${Object.keys(data).length} TABLES` : "EMPTY"}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
