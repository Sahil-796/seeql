"use client"

import { useState } from "react"
import { SQLEditor } from "@/components/sql/sql-editor"
import { ResultsTable } from "@/components/sql/results-table"
import { SchemaViewer } from "@/components/sql/schema-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Zap, Loader2, Database, Eye, Clock, CheckCircle2 } from "lucide-react"

const EXAMPLE_QUERIES = [
  {
    name: "Simple SELECT",
    query: `SELECT u.name, u.email, o.total 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE o.total > 100 
ORDER BY o.total DESC 
LIMIT 10`,
  },
  {
    name: "Aggregation",
    query: `SELECT 
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent,
  AVG(o.total) as avg_order
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0`,
  },
  {
    name: "Subquery",
    query: `SELECT * FROM users 
WHERE id IN (
  SELECT user_id FROM orders 
  WHERE total > (SELECT AVG(total) FROM orders)
)`,
  },
]

interface QuickRunResponse {
  inferredSchema: {
    tables: string[]
    columns: Record<string, string[]>
    relationships: Record<string, string>
  }
  previewData: Array<Record<string, any>>
  sqlToExecute: string
  executionTime?: number
}

export function QuickMode() {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<QuickRunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("results")

  const handleRunQuery = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock response for now
      const mockResponse: QuickRunResponse = {
        inferredSchema: {
          tables: ["users", "orders"],
          columns: {
            users: ["id", "name", "email", "created_at"],
            orders: ["id", "user_id", "total", "status", "created_at"],
          },
          relationships: {
            "orders.user_id": "users.id",
          },
        },
        previewData: [
          { name: "John Doe", email: "john@example.com", total: 250.0 },
          { name: "Jane Smith", email: "jane@example.com", total: 180.5 },
          { name: "Bob Johnson", email: "bob@example.com", total: 320.75 },
          { name: "Alice Brown", email: "alice@example.com", total: 150.0 },
          { name: "Charlie Wilson", email: "charlie@example.com", total: 210.25 },
        ],
        sqlToExecute: query,
        executionTime: 45,
      }

      setResult(mockResponse)
      setActiveTab("results")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example: (typeof EXAMPLE_QUERIES)[0]) => {
    setQuery(example.query)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Quick SQL Runner</CardTitle>
            </div>
            <Badge variant="secondary">Instant Preview</Badge>
          </div>
          <CardDescription>
            Write any SQL query and we&apos;ll infer the schema, generate sample data, and show
            results instantly. Perfect for testing queries without setting up tables first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Example Queries</h4>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example) => (
                <Button
                  key={example.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                >
                  {example.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">SQL Query</h4>
            <SQLEditor
              value={query}
              onChange={setQuery}
              height="200px"
              placeholder="-- Write your SQL query here...
-- Example: SELECT * FROM users WHERE age > 25"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Press Ctrl+Enter to run
            </div>
            <Button
              onClick={handleRunQuery}
              disabled={isLoading || !query.trim()}
              className="gap-2"
            >
              {isLoading ? (
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

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle>Query Results</CardTitle>
              </div>
              {result.executionTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{result.executionTime}ms</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="results" className="gap-2">
                  <Database className="h-4 w-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="schema" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Inferred Schema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="results" className="mt-0">
                <ResultsTable data={result.previewData} maxHeight="350px" />
              </TabsContent>

              <TabsContent value="schema" className="mt-0">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Detected Tables</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.inferredSchema.tables.map((table) => (
                      <Badge key={table} variant="outline">
                        {table}
                      </Badge>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <h4 className="text-sm font-medium mb-3">Columns</h4>
                  <div className="space-y-2">
                    {Object.entries(result.inferredSchema.columns).map(
                      ([table, columns]) => (
                        <div key={table} className="text-sm">
                          <span className="font-mono text-primary">{table}</span>
                          <span className="text-muted-foreground mx-2">→</span>
                          <span className="font-mono text-xs">
                            {columns.join(", ")}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {Object.keys(result.inferredSchema.relationships).length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h4 className="text-sm font-medium mb-3">Relationships</h4>
                      <div className="space-y-1">
                        {Object.entries(result.inferredSchema.relationships).map(
                          ([from, to]) => (
                            <div key={`${from}-${to}`} className="text-sm flex items-center gap-2">
                              <span className="font-mono text-xs">{from}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono text-xs">{to}</span>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
