# Seeql Architecture

## Overview

Seeql is a SQL playground with two modes:
- **QuickMode**: Stateless SQL execution with auto-generated mock data
- **PlaygroundMode**: Stateful SQL playground with persistent sessions

## Request Flow

### QuickMode Flow (`POST /quick-run`)

```
Client
  ↓
RateLimiter [5 req/min, burst 2]
  ↓
POST /quick-run
  ↓
handlers.QuickRun()
  ├── db.IsSingleStatement() [blocks multi-stmt attacks]
  ├── splitStatements() [splits by ; respecting quotes]
  └── For each statement:
      ↓
      modes.NewMode(ModeQuick, nil)
        ↓
        QuickMode.Run()
          ├── schema.BuildSchema() [infer schema from SQL]
          │   └── parser.Parse() [Vitess]
          ├── Table count validation [MaxTablesPerSession = 50]
          ├── generator.New() + GenerateData() [create fake data]
          ├── db.CreateTable() [SQLite CREATE TABLE]
          ├── db.InsertData() [INSERT generated data]
          └── db.ExecuteQuery()
              ├── db.ValidateSelectQuery()
              │   ├── validateLength() [10KB limit]
              │   ├── Dangerous pattern check [PRAGMA, ATTACH, etc]
              │   └── JOIN count check [max 10]
              ├── db.AddRowLimit() [adds LIMIT 1000]
              └── sql.DB.QueryContext() [30s timeout]
```

### PlaygroundMode Flow (`POST /playground/session/:id/execute`)

```
Client
  ↓
RateLimiter [10 req/min, burst 3]
  ↓
POST /playground/session/:id/execute
  ↓
handlers.ExecutePlaygroundQuery()
  ├── SessionManager.GetSession() [retrieve from memory]
  └── modes.NewMode(ModePlayground, session)
        ↓
        PlaygroundMode.Run()
          ├── parser.Parse() [Vitess]
          └── Switch on statement type:
              ├── CreateTable → handleCreateTable()
              │   ├── Table count validation [max 50 tables]
              │   ├── parser.ExtractSchemaFromDDL()
              │   ├── db.CreateTable()
              │   └── Update session schema
              ├── Select → handleSelect()
              │   └── db.ExecuteQuery() [same as QuickMode]
              ├── Insert → handleInsert()
              │   ├── db.ValidateQuery() [length + dangerous patterns]
              │   └── session.DB.ExecContext()
              ├── Update → handleUpdate()
              │   ├── db.ValidateQuery()
              │   └── session.DB.ExecContext()
              ├── Delete → handleDelete()
              │   ├── db.ValidateQuery()
              │   └── session.DB.ExecContext()
              └── default → executeRaw()
                  └── db.ExecuteRaw() [tries SELECT then Exec]
```

### Session Management Flow

```
POST /playground/session
  ↓
handlers.CreateSession()
  ↓
SessionManager.CreateSession()
  ├── uuid.New() [generate session ID]
  ├── sql.Open("sqlite3", "./data/sessions/{id}.db")
  └── Store in memory map: sessions[id] = session

DELETE /playground/session/:id
  ↓
handlers.CloseSession()
  ↓
SessionManager.CloseSession(id)
  ├── session.DB.Close()
  ├── os.Remove(dbPath) [cleanup file]
  └── delete(sessions, id)

GET /playground/session/:id/schema
  ↓
handlers.GetSessionSchema()
  ↓
SessionManager.GetSession()
  └── Return session.Schema [all tables in session]
```

### Session Schema Flow (`GET /playground/session/:id/schema`)

```
Client (page refresh / load dashboard)
  ↓
GET /playground/session/:id/schema
  ↓
handlers.GetSessionSchema()
  ├── SessionManager.GetSession(id)
  └── Return {
        session_id: "uuid",
        schema: {
          tables: [...],        // All tables in session
          relationships: [...]
        }
      }
```

**Use Case:** Dashboard shows all tables on initial load without running a query

## Package Structure

```
apps/
└── api/
    ├── handlers/          # HTTP request handlers
    │   ├── quick_run.go   # QuickMode endpoint
    │   ├── playground.go  # Playground endpoints
    │   ├── health.go      # Health check
    │   └── *_test.go      # Handler tests
    ├── middleware/        # HTTP middleware
    │   └── limiter.go     # Rate limiting
    └── routes/
        └── routes.go      # Route setup with rate limits

internal/
├── db/                    # Database operations
│   ├── execute.go         # Query execution (SELECT/INSERT/UPDATE/DELETE)
│   ├── session.go         # Session management (PlaygroundMode)
│   ├── guardrails.go      # Query validation & limits
│   └── sqlite.go          # [DEAD CODE] - not used
├── modes/                 # Execution modes
│   ├── interface.go       # ExecutionMode interface
│   ├── quick.go           # QuickMode implementation
│   └── playground.go      # PlaygroundMode implementation
├── parser/                # SQL parsing
│   ├── parser.go          # Vitess wrapper
│   ├── tables.go          # Extract table names
│   ├── columns.go         # Extract columns
│   ├── joins.go           # Extract JOINs
│   ├── ddl.go             # Parse CREATE TABLE
│   └── aggregations.go    # [DEAD CODE] - only used in tests
├── schema/                # Schema types & inference
│   ├── types.go           # Schema structs
│   └── builder.go         # Schema inference from SQL
└── generator/             # Fake data generation
    └── data.go            # Generate mock data
```

## Key Constants

```go
// Query Limits
MaxQueryLength      = 10000  // 10KB
MaxRowsPerQuery     = 1000   // Auto-adds LIMIT
MaxJoinsPerQuery    = 10     // Per SELECT
MaxTablesPerSession = 50     // Across all tables

// Timeouts
QueryTimeout        = 30 * time.Second  // Per query execution

// Rate Limits
QuickRunRate        = 1 request per 12s (5/min), burst 2
PlaygroundExecRate  = 1 request per 6s (10/min), burst 3
SessionMgmtRate     = 1 request per 2s (30/min), burst 5
```

## Security Layers

1. **Rate Limiting** (middleware/limiter.go)
   - Per-IP token bucket
   - Different limits per endpoint

2. **Query Validation** (db/guardrails.go)
   - Length check (10KB max)
   - Dangerous pattern blocking:
     - PRAGMA, ATTACH, DETACH
     - load_extension(), randomblob(), zeroblob()
     - generate_series(), UNION SELECT
     - Multi-statement detection (; DROP, ; DELETE, etc)
   - JOIN limit (max 10)
   - Row limit (auto-adds LIMIT 1000)

3. **Resource Limits**
   - Max tables per session: 50
   - Query timeout: 30 seconds
   - Single statement only (QuickMode)

4. **SQLite Protections**
   - load_extension() disabled by default in SQLite
   - In-memory DB for QuickMode (isolated)
   - File-based DB per session for PlaygroundMode

## Data Flow

### QuickMode Data Flow

```
SQL Query
  ↓
Parse (Vitess)
  ↓
Infer Schema
  ├── Detect tables from SELECT
  ├── Detect columns from SELECT
  ├── Detect relationships from JOINs
  └── Infer types from column names
  ↓
Generate Data
  ├── Create Generator with RNG seed
  ├── Generate PKs first
  ├── Generate FKs (reference PKs)
  └── Generate other columns by type
  ↓
Execute
  ├── CREATE TABLE (in-memory SQLite)
  ├── INSERT data
  └── SELECT query with LIMIT
  ↓
Return JSON
```

### PlaygroundMode Data Flow

```
SQL Query
  ↓
Parse (Vitess)
  ↓
Route by type
  ↓
CREATE TABLE
  ├── Parse DDL
  ├── Validate table count
  ├── Execute CREATE TABLE
  └── Store schema in session
  ↓
SELECT
  └── ExecuteQuery (with guardrails)
  ↓
INSERT/UPDATE/DELETE
  ├── Validate query (guardrails)
  └── Execute DML
  ↓
Return JSON
```

## State Management

### QuickMode
- **State**: In-memory SQLite database
- **Lifetime**: Single request
- **Isolation**: New DB per request
- **Cleanup**: Automatic (defer mode.Close())

### PlaygroundMode
- **State**: File-based SQLite database + in-memory schema
- **Lifetime**: Until session closed or expired
- **Storage**: `./data/sessions/{session_id}.db`
- **Cleanup**: Manual (DELETE endpoint) or scheduled (CleanupOldSessions)

## Known Dead Code (For Future Cleanup)

- `internal/db/sqlite.go` - Init() never called
- `internal/db/execute.go` - ExecuteInsert/Update/Delete never called
- `internal/db/session.go` - CleanupOldSessions() never called
- `internal/parser/aggregations.go` - Only used in tests
- `internal/modes/interface.go` - GetSchema() interface method unused
- `internal/modes/quick.go` - GetSchema() implementation unused
- `internal/modes/playground.go` - GetSchema() implementation unused

## Redis Integration Notes

For horizontal scaling, sessions need external storage:

**What to store in Redis:**
- Session metadata: ID, CreatedAt, LastUsed, TableCount
- Session schema: Table definitions (JSON)
- **NOT** the DB connection (can't serialize)

**What stays in memory:**
- Active sql.DB connections
- Rate limiter state (or move to Redis too)

**Session lookup flow with Redis:**
```
GetSession(id)
  ├── Check local map first (hot path)
  ├── If miss: Fetch from Redis
  ├── Reopen DB connection: sql.Open("sqlite3", path)
  └── Cache in local map
```
