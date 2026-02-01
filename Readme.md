# Seeql

Architecture for Both Modes:**

```
Frontend (React/Vue/Svelte)          Backend (Go)
├─ SQL Editor                         ├─ SQL Parser
├─ Schema Visualizer                  ├─ Schema Builder
├─ Data Table Viewer                  ├─ Data Generator
└─ Query Runner                       ├─ In-Memory SQLite/DB
                                      └─ Query Executor
```

**Why you NEED backend for the playground:**

1. **SQL Parsing** - Can't reliably parse complex SQL in browser
2. **Data Generation** - Go's faker libraries, UUID generation, constraints
3. **Query Execution** - Need actual SQL engine (SQLite in-memory is perfect)
4. **State Management** - Tables persist across queries

**Workflow 1: Quick Mode**

```go
// Backend endpoint
POST /api/quick-run
Body: { "query": "SELECT u.name, o.total FROM users u JOIN orders o..." }

Response: {
  "inferredSchema": {
    "tables": ["users", "orders"],
    "columns": {...},
    "relationships": {...}
  },
  "previewData": [...],  // First 5 rows
  "sqlToExecute": "SELECT..." // The original query
}
```

**Workflow 2: Full Playground**

```go
// User sends CREATE TABLE first
POST /api/schema
Body: { "createStatements": ["CREATE TABLE users...", "CREATE TABLE orders..."] }

// Then queries work normally
POST /api/query
Body: { "query": "SELECT * FROM users" }
Response: { "data": [...], "schema": {...} }
```

**Tech Stack:**
- **Backend**: Go + SQLite (in-memory) or DuckDB
- **Frontend**: Monaco Editor (VS Code's editor) for SQL input

The backend runs an actual SQLite database in-memory for each session, so all SQL features work (JOINs, aggregates, subqueries, etc.).

Want me to sketch the API endpoints?