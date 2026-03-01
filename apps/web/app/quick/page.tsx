"use client";

import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	Github,
	Loader2,
	Play,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSeeql } from "@/lib/hooks";
import type { Schema } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLE_QUERY = `SELECT u.id, u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id`;

function SchemaBlock({ schema }: { schema: Schema }) {
  return (
    <div className="font-mono text-sm space-y-4">
      {schema.tables.map((table) => (
        <div key={table.name}>
          <div className="text-destructive font-medium">
            CREATE TABLE {table.name} {"{"}
          </div>
          {table.columns.map((col) => (
            <div key={col.name} className="pl-4 py-0.5">
              <span className="text-amber-500 dark:text-amber-400">
                {col.name}
              </span>
              <span className="text-muted-foreground"> : </span>
              <span className="text-green-600 dark:text-green-400">
                {col.type || "TEXT"}
              </span>
              {col.is_primary && (
                <Badge
                  variant="outline"
                  className="ml-2 text-[10px] px-1 py-0 h-4 bg-amber-500/10 border-amber-500/30 text-amber-600"
                >
                  PK
                </Badge>
              )}
              {col.is_foreign && (
                <Badge
                  variant="outline"
                  className="ml-2 text-[10px] px-1 py-0 h-4 bg-blue-500/10 border-blue-500/30 text-blue-600"
                >
                  FK → {col.ref_table}.{col.ref_column}
                </Badge>
              )}
            </div>
          ))}
          <div className="text-destructive">{"}"}</div>
        </div>
      ))}
      {schema.relationships && schema.relationships.length > 0 && (
        <div className="pt-3 border-t">
          <div className="text-muted-foreground text-xs mb-2 uppercase tracking-wider">
            Relationships
          </div>
          {schema.relationships.map((rel) => (
            <div
              key={`${rel.LeftTable}.${rel.LeftColumn}-${rel.RightTable}.${rel.RightColumn}`}
              className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 py-0.5"
            >
              <span>
                {rel.LeftTable}.{rel.LeftColumn}
              </span>
              <ChevronRight className="h-3 w-3" />
              <span>
                {rel.RightTable}.{rel.RightColumn}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuickModePage() {
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
  const [isRefOpen, setIsRefOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(true);
  const pathname = usePathname();

  const handleRun = () => {
    if (sql.trim()) {
      setHistory((prev) => [...prev.slice(-4), sql.trim()]);
      runQuery(sql, rowCount);
    }
  };

  const hasResults =
    schema ||
    (rows && rows.length > 0) ||
    (data && Object.keys(data).length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches playground exactly */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                SeeQL
              </span>
            </Link>
            <Badge variant="secondary" className="font-normal">
              Quick Mode
            </Badge>
          </div>
          <div className="flex items-center gap-4">
				<ThemeSwitcher />
				<nav className="flex items-center gap-1">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/">Playground</Link>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className={cn(pathname === "/quick" && "text-foreground")}
						asChild
					>
						<Link href="/quick">Quick Mode</Link>
					</Button>
				</nav>
				<Button
					variant="ghost"
					size="icon"
					asChild
					className="h-8 w-8"
				>
					<Link
						href="https://github.com/Sahil-796"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Github className="h-4 w-4" />
					</Link>
				</Button>
			</div>
        </div>
      </header>

      {/* Main layout */}
      <main className="h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Output panel */}
          <ResizablePanel defaultSize={68} minSize={30}>
            <div className="h-full overflow-y-auto p-6 space-y-4">
              {/* Empty state */}
              {!sql.trim() && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="mb-4 p-4 rounded-full bg-muted/50">
                    <Play className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Write a SQL query to get started
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    SeeQL will infer your schema and generate realistic mock
                    data automatically.
                  </p>
                </div>
              )}

              {/* Query history */}
              {history.length > 0 && (
                <div className="space-y-1">
                  {history.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      className="w-full flex items-start gap-2 px-3 py-1.5 rounded-md bg-muted/30 text-xs font-mono text-muted-foreground hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setSql(cmd)}
                    >
                      <span className="text-primary/50 select-none shrink-0 mt-0.5">
                        ›
                      </span>
                      <span className="truncate">{cmd}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <X className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Layout toggle when there are results */}
              {hasResults && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Layout</span>
                  <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setIsSplitView(false)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors",
                        !isSplitView
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Stacked
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSplitView(true)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors",
                        isSplitView
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Side by side
                    </button>
                  </div>
                </div>
              )}

              {/* Results grid */}
              <div
                className={cn(
                  "grid gap-4",
                  isSplitView ? "lg:grid-cols-2" : "grid-cols-1",
                )}
              >
                {/* Inferred Schema */}
                {schema && (
                  <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <ChevronRight className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">
                          Inferred Schema
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 ml-auto"
                        >
                          {schema.tables.length} table
                          {schema.tables.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <SchemaBlock schema={schema} />
                    </CardContent>
                  </Card>
                )}

                {/* Generated Data */}
                {data && Object.keys(data).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-green-500/10">
                          <ChevronRight className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium text-sm">
                          Generated Data
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 ml-auto"
                        >
                          {Object.keys(data).length} table
                          {Object.keys(data).length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                      {Object.entries(data).map(([tableName, tableRows]) => (
                        <DataTable
                          key={tableName}
                          data={tableRows}
                          tableName={tableName}
                          maxRows={15}
                          className="rounded-lg border bg-muted/20"
                          tableClassName="border-separate border-spacing-0"
                          captionClassName="text-muted-foreground"
                          cellClassName="border-b"
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
                    </CardContent>
                  </Card>
                )}

                {/* Query Results */}
                {rows && rows.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-500/10">
                          <ChevronRight className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-sm">
                          Query Results
                        </span>
                        {resultRowCount != null && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 ml-auto"
                          >
                            {resultRowCount} rows
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {columns && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {columns.join(", ")}
                        </p>
                      )}
                      <DataTable
                        data={rows}
                        tableName=""
                        maxRows={15}
                        className="rounded-lg border bg-muted/20"
                        tableClassName="border-separate border-spacing-0"
                        captionClassName="text-muted-foreground"
                        cellClassName="border-b"
                        getRowKey={(row, index) =>
                          String(
                            row.id ?? row.ID ?? row.Id ?? `result-${index}`,
                          )
                        }
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing query...
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Input panel */}
          <ResizablePanel defaultSize={32} minSize={18}>
            <div className="h-full border-t bg-background flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Rows per table
                  </span>
                  <input
                    type="number"
                    value={rowCount}
                    onChange={(e) =>
                      setRowCount(
                        Math.max(1, parseInt(e.target.value, 10) || 1),
                      )
                    }
                    className="w-14 h-7 bg-background border border-border rounded-md px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    min={1}
                    max={100}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRefOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Reference
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isRefOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <Button
                    size="sm"
                    onClick={handleRun}
                    disabled={isLoading || !sql.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1.5" />
                    )}
                    Run
                  </Button>
                </div>
              </div>

{/* Quick reference panel */}
				{isRefOpen && (
					<div className="border-b bg-muted/10 px-5 py-4 space-y-4 text-xs">
						<div className="grid grid-cols-3 gap-4 text-muted-foreground">
							<div>
								<div className="font-medium text-foreground mb-1.5">
									Supported
								</div>
								<div>SELECT with JOINs</div>
								<div>Multiple tables</div>
								<div>Column aliases</div>
							</div>
							<div>
								<div className="font-medium text-foreground mb-1.5">
									Auto-detected
								</div>
								<div>Primary keys (id)</div>
								<div>Foreign keys (*_id)</div>
								<div>Relationships</div>
							</div>
							<div>
								<div className="font-medium text-foreground mb-1.5">
									Example
								</div>
								<pre className="text-blue-600 dark:text-blue-400 whitespace-pre-wrap leading-relaxed">{`SELECT u.name, p.title
FROM users u
JOIN posts p
ON u.id = p.user_id`}</pre>
							</div>
						</div>
						<div className="border-t pt-3">
							<div className="flex items-center gap-1.5 mb-2">
								<span className="font-medium text-foreground">Limitations</span>
								<span className="text-muted-foreground">— Quick Mode uses SQLite. Some features are not supported:</span>
							</div>
							<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
								<div>• No PostgreSQL functions: <code className="text-amber-600">array_agg()</code>, <code className="text-amber-600">json_agg()</code>, <code className="text-amber-600">to_char()</code></div>
								<div>• No MySQL functions: <code className="text-amber-600">GROUP_CONCAT()</code>, <code className="text-amber-600">FIND_IN_SET()</code></div>
								<div>• No CTEs (WITH clauses) or recursive queries</div>
								<div>• No FULL OUTER JOIN</div>
								<div>• No window functions with custom frames</div>
								<div>• No subqueries in FROM clause</div>
							</div>
							<div className="mt-2 text-muted-foreground/70 italic">
								Need full PostgreSQL/MySQL support? Use Playground mode with CREATE TABLE, INSERT, etc.
							</div>
						</div>
					</div>
				)}

              {/* Textarea */}
              <div className="flex flex-1 min-h-0 items-start gap-2 p-4">
                <span className="text-primary/60 pt-1 text-sm select-none font-mono">
                  ›
                </span>
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const target = e.currentTarget;
                      const start = target.selectionStart ?? 0;
                      const end = target.selectionEnd ?? 0;
                      const nextValue = `${sql.slice(0, start)}\t${sql.slice(end)}`;
                      setSql(nextValue);
                      requestAnimationFrame(() => {
                        target.selectionStart = target.selectionEnd = start + 1;
                      });
                      return;
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleRun();
                    }
                  }}
                  placeholder={EXAMPLE_QUERY}
                  className="flex-1 h-full bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-mono leading-relaxed"
                />
              </div>

              {/* Footer hint */}
              <div className="px-5 pb-3 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">
                  Cmd+Enter
                </kbd>
                <span>to run</span>
                <span className="mx-1">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">
                  Tab
                </kbd>
                <span>to indent</span>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
