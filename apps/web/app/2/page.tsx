"use client";

import { useState, useEffect } from "react";
import { useSeeql } from "@/lib/hooks";
import type { Schema } from "@/lib/types";

const EXAMPLE_QUERY = `SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id`;

function TerminalPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#39ff14] select-none">{">"}</span>
      <span>{children}</span>
    </div>
  );
}

function AsciiTable({ data, tableName }: { data: Record<string, unknown>[]; tableName: string }) {
  if (data.length === 0) return null;
  
  const columns = Object.keys(data[0]);
  const colWidths = columns.map(col => {
    const maxDataWidth = Math.max(...data.map(row => String(row[col] ?? "NULL").length));
    return Math.max(col.length, maxDataWidth, 4);
  });
  
  const horizontalLine = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+";
  
  const formatRow = (values: string[]) => 
    "|" + values.map((v, i) => ` ${v.padEnd(colWidths[i])} `).join("|") + "|";

  return (
    <div className="font-mono text-xs whitespace-pre overflow-x-auto">
      <div className="text-[#666] mb-1">// TABLE: {tableName} ({data.length} rows)</div>
      <div className="text-[#39ff14]">{horizontalLine}</div>
      <div className="text-[#fff]">{formatRow(columns)}</div>
      <div className="text-[#39ff14]">{horizontalLine}</div>
      {data.slice(0, 15).map((row, i) => (
        <div key={i} className="text-[#ccc]">
          {formatRow(columns.map(col => String(row[col] ?? "NULL").slice(0, colWidths[columns.indexOf(col)])))}
        </div>
      ))}
      <div className="text-[#39ff14]">{horizontalLine}</div>
      {data.length > 15 && (
        <div className="text-[#666] mt-1">... {data.length - 15} more rows</div>
      )}
    </div>
  );
}

function SchemaBlock({ schema }: { schema: Schema }) {
  return (
    <div className="font-mono text-xs">
      {schema.tables.map(table => (
        <div key={table.name} className="mb-4">
          <div className="text-[#ff6b6b]">CREATE TABLE {table.name} {"{"}</div>
          {table.columns.map(col => (
            <div key={col.name} className="pl-4 text-[#ccc]">
              <span className="text-[#ffd93d]">{col.name}</span>
              <span className="text-[#666]"> : </span>
              <span className="text-[#6bcb77]">{col.type || "TEXT"}</span>
              {col.is_primary && <span className="text-[#ff6b6b]"> [PK]</span>}
              {col.is_foreign && (
                <span className="text-[#4d96ff]"> [FK → {col.ref_table}.{col.ref_column}]</span>
              )}
            </div>
          ))}
          <div className="text-[#ff6b6b]">{"}"}</div>
        </div>
      ))}
      {schema.relationships && schema.relationships.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#333]">
          <div className="text-[#666] mb-2">// RELATIONSHIPS</div>
          {schema.relationships.map((rel, i) => (
            <div key={i} className="text-[#4d96ff]">
              {rel.LeftTable}.{rel.LeftColumn} {"===>"} {rel.RightTable}.{rel.RightColumn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TerminalView() {
  const { sql, schema, data, isLoading, error, setSql, runQuery } = useSeeql();
  const [rowCount, setRowCount] = useState(10);
  const [history, setHistory] = useState<string[]>([]);
  const [time, setTime] = useState("");

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
      setHistory(prev => [...prev.slice(-4), sql.trim()]);
      runQuery(sql, rowCount);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#ccc] font-mono">
      {/* Terminal Header */}
      <header className="bg-[#1a1a1a] border-b-2 border-[#39ff14] px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[#39ff14] text-sm font-bold tracking-wider">SEEQL_TERMINAL v1.0</span>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <nav className="flex gap-4">
            <a href="/1" className="text-[#666] hover:text-[#39ff14] transition-colors">[01:EDIT]</a>
            <a href="/2" className="text-[#39ff14]">[02:TERM]</a>
            <a href="/3" className="text-[#666] hover:text-[#39ff14] transition-colors">[03:SOFT]</a>
            <a href="/4" className="text-[#666] hover:text-[#39ff14] transition-colors">[04:LUXE]</a>
            <a href="/5" className="text-[#666] hover:text-[#39ff14] transition-colors">[05:NEON]</a>
          </nav>
          <span className="text-[#39ff14]">{time}</span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Main Terminal Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Output Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome Message */}
            <div className="text-[#666] text-xs border border-[#333] p-3 bg-[#111]">
              <pre>{`
  ____  _____ _____ ___  _     
 / ___|| ____| ____/ _ \\| |    
 \\___ \\|  _| |  _|| | | | |    
  ___) | |___| |__| |_| | |___ 
 |____/|_____|_____\\__\\_\\_____|
                               
 SQL Playground & Schema Visualizer
 Type your query below and press ENTER or click [EXECUTE]
              `}</pre>
            </div>

            {/* History */}
            {history.map((cmd, i) => (
              <TerminalPrompt key={i}>
                <span className="text-[#666]">{cmd}</span>
              </TerminalPrompt>
            ))}

            {/* Error Output */}
            {error && (
              <div className="text-[#ff6b6b] bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 p-3 text-xs">
                <span className="font-bold">ERROR:</span> {error}
              </div>
            )}

            {/* Schema Output */}
            {schema && (
              <div className="border border-[#333] bg-[#111] p-4">
                <div className="text-[#39ff14] text-xs mb-3 pb-2 border-b border-[#333]">
                  ▓▓▓ INFERRED SCHEMA ▓▓▓
                </div>
                <SchemaBlock schema={schema} />
              </div>
            )}

            {/* Data Output */}
            {data && Object.keys(data).length > 0 && (
              <div className="border border-[#333] bg-[#111] p-4">
                <div className="text-[#39ff14] text-xs mb-3 pb-2 border-b border-[#333]">
                  ▓▓▓ GENERATED DATA ▓▓▓
                </div>
                <div className="space-y-6">
                  {Object.entries(data).map(([tableName, rows]) => (
                    <AsciiTable key={tableName} data={rows} tableName={tableName} />
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="text-[#39ff14] animate-pulse">
                Processing query...
                <span className="animate-ping inline-block ml-1">_</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-[#333] bg-[#0a0a0a] p-4">
            <div className="flex items-center gap-2 mb-2 text-xs text-[#666]">
              <span>ROWS_PER_TABLE:</span>
              <input
                type="number"
                value={rowCount}
                onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-transparent border border-[#333] px-2 py-0.5 text-[#39ff14] focus:outline-none focus:border-[#39ff14]"
                min={1}
                max={100}
              />
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#39ff14] pt-2">{">"}</span>
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
                className="flex-1 bg-transparent resize-none text-[#fff] placeholder:text-[#444] focus:outline-none min-h-[60px]"
                rows={3}
              />
              <button
                onClick={handleRun}
                disabled={isLoading || !sql.trim()}
                className="px-4 py-2 bg-[#39ff14] text-[#0d0d0d] text-xs font-bold hover:bg-[#2ee00d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                [EXECUTE]
              </button>
            </div>
            <div className="text-xs text-[#444] mt-2">
              Press Ctrl+Enter to execute | Tab to indent
            </div>
          </div>
        </main>

        {/* Side Panel - Quick Reference */}
        <aside className="w-64 border-l-2 border-[#333] bg-[#0a0a0a] p-4 text-xs overflow-y-auto hidden lg:block">
          <div className="text-[#39ff14] font-bold mb-4">// QUICK REFERENCE</div>
          
          <div className="space-y-4 text-[#666]">
            <div>
              <div className="text-[#ffd93d] mb-1">Supported Queries:</div>
              <div>- SELECT with JOINs</div>
              <div>- Multiple tables</div>
              <div>- Column aliases</div>
            </div>

            <div>
              <div className="text-[#ffd93d] mb-1">Auto-Detection:</div>
              <div>- Primary keys (id)</div>
              <div>- Foreign keys (*_id)</div>
              <div>- Relationships</div>
            </div>

            <div>
              <div className="text-[#ffd93d] mb-1">Example:</div>
              <pre className="text-[#4d96ff] whitespace-pre-wrap">
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
