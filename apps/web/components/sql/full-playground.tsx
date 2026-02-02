"use client"

import { useState } from "react"
import { SQLEditor } from "@/components/sql/sql-editor"
import { ResultsTable } from "@/components/sql/results-table"
import { SchemaViewer } from "@/components/sql/schema-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Database,
  Play,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Table2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

const DEFAULT_SCHEMA = `-- Create your tables here
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  age INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0
);`

interface QueryResult {
  data: Array<Record<string, any>>
  schema: {
    columns: Array<{ name: string; type: string }>
  }
  executionTime: number
  rowCount: number
}

interface TableInfo {
  name: string
  columns: Array<{
    name: string
    type: string
    isPrimary?: boolean
    isForeign?: boolean
    references?: string
  }>
}

export function FullPlayground() {
  const [schema, setSchema] = useState(DEFAULT_SCHEMA)
  const [query, setQuery] = useState("SELECT * FROM users LIMIT 10")
  const [isSchemaLoading, setIsSchemaLoading] = useState(false)
  const [isQueryLoading, setIsQueryLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([
    {
      name: "users",
      columns: [
        { name: "id", type: "INTEGER", isPrimary: true },
        { name: "name", type: "TEXT" },
        { name: "email", type: "TEXT" },
        { name: "age", type: "INTEGER" },
        { name: "created_at", type: "TIMESTAMP" },
      ],
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "INTEGER", isPrimary: true },
        { name: "user_id", type: "INTEGER", isForeign: true, references: "users.id" },
        { name: "total", type: "DECIMAL" },
        { name: "status", type: "TEXT" },
        { name: "created_at", type: "TIMESTAMP" },
      ],
    },
    {
      name: "products",
      columns: [
        { name: "id", type: "INTEGER", isPrimary: true },
        { name: "name", type: "TEXT" },
        { name: "price", type: "DECIMAL" },
        { name: "stock", type: "INTEGER" },
      ],
    },
  ])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("query")
  const [queryHistory, setQueryHistory] = useState<string[]>([])

  const handleApplySchema = async () => {
    setIsSchemaLoading(true)
    setError(null)

    try {
      // Simulate API call to apply schema
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Parse CREATE TABLE statements (simplified)
      const parsedTables = parseCreateStatements(schema)
      setTables(parsedTables)

      // Show success
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply schema")
    } finally {
      setIsSchemaLoading(false)
    }
  }

  const handleRunQuery = async () => {
    if (!query.trim()) return

    setIsQueryLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Mock result based on query
      const mockResult: QueryResult = {
        data: generateMockData(query, tables),
        schema: {
          columns: [
            { name: "id", type: "INTEGER" },
            { name: "name", type: "TEXT" },
            { name: "email", type: "TEXT" },
            { name: "created_at", type: "TIMESTAMP" },
          ],
        },
        executionTime: 32,
        rowCount: 10,
      }

      setQueryResult(mockResult)
      setQueryHistory((prev) => [query, ...prev.slice(0, 9)])
      setActiveTab("results")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
    } finally {
      setIsQueryLoading(false)
    }
  }

  const handleClearHistory = () => {
    setQueryHistory([])
  }

  const handleHistoryClick = (historicalQuery: string) => {
    setQuery(historicalQuery)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Schema Definition</CardTitle>
              </div>
              <Badge variant="outline">{tables.length} tables</Badge>
            </div>
            <CardDescription>
              Define your database schema using CREATE TABLE statements. Apply the schema
              to initialize your playground.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SQLEditor
              value={schema}
              onChange={setSchema}
              height="250px"
              placeholder="-- Define your schema here
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Supports: CREATE TABLE, ALTER TABLE, DROP TABLE
              </div>
              <Button
                onClick={handleApplySchema}
                disabled={isSchemaLoading || !schema.trim()}
                variant="secondary"
                className="gap-2"
              >
                {isSchemaLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Schema
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                <CardTitle>Query Playground</CardTitle>
              </div>
              {queryResult && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Last: {queryResult.executionTime}ms</span>
                </div>
              )}
            </div>
            <CardDescription>
              Run SQL queries against your defined schema. All standard SQL operations
              are supported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="query" className="gap-2">
                  <Database className="h-4 w-4" />
                  Query Editor
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2">
                  <Play className="h-4 w-4" />
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="query" className="mt-0 space-y-4">
                <SQLEditor
                  value={query}
                  onChange={setQuery}
                  height="200px"
                  placeholder="-- Write your query here
SELECT * FROM users WHERE age > 25;"
                />

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Press Ctrl+Enter to run
                  </div>
                  <Button
                    onClick={handleRunQuery}
                    disabled={isQueryLoading || !query.trim()}
                    className="gap-2"
                  >
                    {isQueryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Query
                      </>
                    )}
                  </Button>
                </div>

                {queryHistory.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Query History
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearHistory}
                        className="h-6 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {queryHistory.map((historicalQuery, idx) => (
                        <button
                          key={`history-${idx}-${historicalQuery.substring(0, 20)}`}
                          type="button"
                          onClick={() => handleHistoryClick(historicalQuery)}
                          className="w-full text-left text-xs font-mono p-2 rounded hover:bg-muted transition-colors truncate"
                        >
                          {historicalQuery}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="mt-0">
                {queryResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {queryResult.rowCount} rows returned
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {queryResult.executionTime}ms
                      </Badge>
                    </div>
                    <ResultsTable data={queryResult.data} maxHeight="350px" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50 gap-3">
                    <Play className="h-8 w-8 opacity-50" />
                    <p className="text-sm">Run a query to see results</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                <CardTitle>Schema Explorer</CardTitle>
              </div>
            </div>
            <CardDescription>
              View your database structure and relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SchemaViewer
              schema={{
                tables,
                relationships: [
                  { from: "orders.user_id", to: "users.id", type: "Many-to-One" },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Plus className="h-4 w-4 text-primary shrink-0" />
              <span>Use CREATE TABLE to define your schema first</span>
            </div>
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <span>All queries run against an in-memory SQLite database</span>
            </div>
            <div className="flex items-start gap-2">
              <Play className="h-4 w-4 text-primary shrink-0" />
              <span>Supports: SELECT, INSERT, UPDATE, DELETE, JOINs, aggregates</span>
            </div>
            <Separator />
            <p className="text-[10px]">
              Data persists only for this session. Refreshing will reset the database.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper function to parse CREATE TABLE statements
function parseCreateStatements(sql: string): TableInfo[] {
  const tables: TableInfo[] = []
  const lines = sql.split(";")

  for (const statement of lines) {
    const trimmed = statement.trim().toUpperCase()
    if (trimmed.startsWith("CREATE TABLE")) {
      const tableNameMatch = statement.match(/CREATE TABLE\s+(\w+)/i)
      if (tableNameMatch) {
        const tableName = tableNameMatch[1]
        const columns: TableInfo["columns"] = []

        // Extract column definitions (simplified parsing)
        const columnSection = statement.match(/\((.*)\)/s)
        if (columnSection) {
          const columnDefs = columnSection[1].split(",")
          for (const def of columnDefs) {
            const trimmedDef = def.trim()
            const parts = trimmedDef.split(/\s+/)
            if (parts.length >= 2 && !trimmedDef.startsWith("FOREIGN") && !trimmedDef.startsWith("PRIMARY")) {
              const colName = parts[0]
              const colType = parts[1]
              const isPrimary = trimmedDef.toUpperCase().includes("PRIMARY KEY")
              const isForeign = trimmedDef.toUpperCase().includes("REFERENCES")

              let references: string | undefined
              if (isForeign) {
                const refMatch = trimmedDef.match(/REFERENCES\s+(\w+\(.+?\))/i)
                if (refMatch) {
                  references = refMatch[1]
                }
              }

              columns.push({
                name: colName,
                type: colType,
                isPrimary,
                isForeign,
                references,
              })
            }
          }
        }

        tables.push({ name: tableName, columns })
      }
    }
  }

  return tables.length > 0 ? tables : []
}

// Helper function to generate mock data based on query
function generateMockData(query: string, tables: TableInfo[]): Array<Record<string, any>> {
  const data: Array<Record<string, any>> = []
  const queryUpper = query.toUpperCase()

  // Simple mock data generation
  for (let i = 1; i <= 10; i++) {
    const row: Record<string, any> = {
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }

    if (queryUpper.includes("AGE")) {
      row.age = 20 + (i * 5)
    }

    if (queryUpper.includes("ORDERS")) {
      row.user_id = i
      row.total = (Math.random() * 500 + 50).toFixed(2)
      row.status = ["pending", "completed", "shipped"][i % 3]
    }

    data.push(row)
  }

  return data
}
