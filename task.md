# Seeql Implementation Progress

## Architecture Overview
Seeql is a SQL testing/debugging tool with two modes:
- **QuickMode**: Parse SELECT → Infer schema → Generate fake data → Execute query on SQLite
- **PlaygroundMode**: Real database with session management (CREATE, INSERT, SELECT, UPDATE, DELETE)

## Completed Components

### Parser Package (`internal/parser/`)
- [x] **parser.go**: SQL parsing using Vitess
  - `Parse(sql string)` → returns `sqlparser.Statement`
- [x] **tables.go**: Extract table aliases and names from SELECT
  - `ExtractTables(stmt)` → map[alias]realName
- [x] **columns.go**: Extract columns per table  
  - `ExtractColumns(stmt, aliases)` → map[table][]columns
  - **FIXED**: Handles unqualified columns (no table alias) in single-table queries
- [x] **joins.go**: Extract JOIN relationships
  - `ExtractJoins(stmt, aliases)` → []Join with table relationships
- [x] **aggregations.go**: Detect aggregate functions (COUNT, SUM, AVG, MIN, MAX)
  - `ExtractAggregations(stmt)` → []AggregateExpr
  - `HasAggregations(stmt)` → bool
  - `GetAggregationReturnType(aggType)` → type string
- [x] **ddl.go**: Parse CREATE TABLE statements
  - `ParseCreateTable(sql)` → parses CREATE TABLE
  - `ExtractSchemaFromDDL(createTable)` → ParsedDDL
  - `IsCreateTable(sql)` → bool
  - **NEW**: Foreign key parsing (inline REFERENCES and table-level FOREIGN KEY constraints)
- [x] **parser_test.go**: Basic test coverage
- [x] **columns_test.go**: Tests for column extraction with/without aliases
- [x] **aggregations_test.go**: Tests for aggregation detection
- [x] **ddl_test.go**: Tests for CREATE TABLE parsing

### Schema Package (`internal/schema/`)
- [x] **types.go**: Core schema types
  - `ColumnSchema`: Name, Type, Nullable, IsPrimary, IsForeign, RefTable, RefColumn, Constraints
  - `TableSchema`: Name, Columns
  - `Schema`: Tables, Relationships
  - `Constraints`: MaxLength, Min, Max, Unique
- [x] **builder.go**: Build schema from parsed SQL
  - `BuildSchema(stmt)` → Infers PK (id columns), FK (ends with _id), relationships from JOINs
  - `inferReferencedTable()` → Matches prefixes to table names (handles pluralization)
  - **NEW**: `inferColumnType()` → Infers 15+ semantic types from column names (INTEGER, EMAIL, BOOLEAN, TIMESTAMP, etc.)
  - **NEW**: PK Map approach for O(1) FK resolution and type matching

### Generator Package (`internal/generator/`)
- [x] **data.go**: Generate fake data based on schema
  - `Generator` struct with RNG and Faker
  - `GenerateData(rowsPerTable)` → map[table][]rows
  - `GenerateColumnValue()` → Type-aware fake values (TEXT, INTEGER, FLOAT, BOOLEAN, DATE, TIMESTAMP, UUID, JSON, EMAIL, URL)
  - Handles PK/FK relationships, NULLABLE, UNIQUE constraints
  - Uses `gofakeit/v7` for realistic data
  - **ENHANCED**: Now receives proper types from schema inference

### DB Package (`internal/db/`)
- [x] **sqlite.go**: SQLite initialization
  - `Init()` → Creates in-memory SQLite DB
- [x] **execute.go**: Query execution, table creation, and data insertion
  - `ExecuteQuery(ctx, db, query)` → Execute with context timeout support
  - `ExecuteInsert()`, `ExecuteUpdate()`, `ExecuteDelete()` → DML operations with context
  - `ExecuteRaw()` → Fallback execution with context
  - `CreateTable(db, table)` → CREATE TABLE with PK, FK, NULL constraints
  - `InsertData(db, tableName, rows)` → Insert generated data into tables
  - `GetTableColumns(ctx, db, table)` → Introspect table columns
  - `AddColumn(db, tableName, col)` → ALTER TABLE ADD COLUMN
  - `mapToSQLiteType()` → Converts semantic types to SQLite storage types
- [x] **session.go**: Session management for PlaygroundMode
  - `Session` struct: ID, DB, Schema, CreatedAt, LastUsed
  - `SessionManager`: In-memory map with sync.RWMutex + file-based SQLite
  - `NewSession(id, db)` → Constructor (ensures Schema is never nil)
  - `CreateSession()` → Creates new session with UUID, stores in memory map
  - `GetSession(id)` → Retrieve session from memory map
  - `CloseSession(id)` → Close DB, cleanup file, remove from map
  - `UpdateSession()` → Updates LastUsed timestamp
  - `CleanupOrphanedDBs()` → Removes .db files not tracked in memory map
  - `getDBPath()` → Returns file path for session database
- [x] **guardrails.go**: Query protection and limits
  - `ValidateQuery()` → Length validation + dangerous pattern blocking
  - `ValidateSelectQuery()` → SELECT-specific validation with JOIN limits
  - `AddRowLimit()` → Auto-adds LIMIT 1000
  - `IsSingleStatement()` → Detects multi-statement attacks
  - Blocks: PRAGMA, ATTACH, load_extension, randomblob, generate_series, UNION SELECT

### Middleware Package (`apps/api/middleware/`)
- [x] **limiter.go**: Per-IP rate limiting
  - Token bucket algorithm
  - Different limits per endpoint type
  - IP detection with proxy support (X-Forwarded-For, X-Real-Ip)

### Modes Package (`internal/modes/`)
- [x] **interface.go**: ExecutionMode interface
  - `Run(ctx, query)` → QueryResult (with context support)
  - `GetSchema()` → Schema
  - `Close()` → error
  - `QueryResult` struct with Columns, Rows, RowCount, Schema
  - `NewMode(mode, session)` → Factory function
- [x] **quick.go**: Complete QuickMode implementation
  - Structure: parsedStmt, schema, data, sqlDB
  - `NewQuickMode()` → Constructor
  - `Run(ctx, query)` → Open DB → Create tables → Insert data → Execute query → Return results
  - **NEW**: Context timeout support
  - **NEW**: Multi-statement support (split by semicolons)
  - **NEW**: CREATE TABLE statement support
  - **NEW**: Table count limit enforcement
  - `GetSchema()` → Returns cached schema
  - `Close()` → Closes sqlDB connection
- [x] **quick_test.go**: Integration tests for QuickMode
- [x] **playground.go**: Complete PlaygroundMode implementation
  - `PlaygroundMode` struct with session reference
  - `NewPlaygroundMode(session)` → Constructor
  - `Run(ctx, query)` → Parse → Route to handler → Execute → Return results
  - `handleCreateTable()` → Extract DDL → Create table → Update session schema
  - `handleSelect()` → Execute SELECT query → Return results
  - `handleInsert()` → Execute INSERT → Return rows affected
  - `handleUpdate()` → Execute UPDATE → Return rows affected
  - `handleDelete()` → Execute DELETE → Return rows affected
  - `executeRaw()` → Fallback execution for unknown statements
  - **NEW**: Table count limit enforcement
  - `GetSchema()` → Returns current session schema
  - `Close()` → Closes session database

### API Handlers (`apps/api/handlers/`)
- [x] **health.go**: `GET /health` → Status OK
- [x] **health_test.go**: Tests for health endpoint
- [x] **schema.go**: `POST /infer` → Parse SQL → Return schema (unused but kept)
- [x] **schema_test.go**: Tests for schema endpoint
- [x] **generate.go**: `POST /generate` → Parse → Schema → Generate data → Return data (unused but kept)
- [x] **generate_test.go**: Tests for generate endpoint
- [x] **quick_run.go**: `POST /quick-run` (fully implemented)
  - Request: `{ "sql": "..." }`
  - **NEW**: Context timeout (30 seconds)
  - **NEW**: Multi-statement support (statements separated by `;`)
  - **NEW**: CREATE TABLE support - users can define explicit schemas
  - **NEW**: Single-statement validation (blocks multi-statement attacks)
  - Uses `modes.NewMode()` → `mode.Run(ctx, query)` → Returns QueryResult
  - Error handling: 400 for bad request, 500 for internal errors
- [x] **quick_run_test.go**: Integration tests for quick-run
- [x] **playground.go**: Playground mode handlers
  - `CreateSession()` → POST /playground/session
  - `CloseSession()` → DELETE /playground/session/:id
  - `ExecutePlaygroundQuery()` → POST /playground/session/:id/execute
  - **NEW**: Context timeout (30 seconds)
  - Uses SessionManager for persistence

### Routes (`apps/api/routes/`)
- [x] **routes.go**: Setup routes with rate limiting
  - `POST /quick-run` (with expensive rate limit)
  - `POST /playground/session` (with lenient rate limit)
  - `DELETE /playground/session/:id` (with lenient rate limit)
  - `POST /playground/session/:id/execute` (with standard rate limit)
  - `GET /health` (no rate limit)

### Main Application (`apps/api/`)
- [x] **main.go**: Gin server on :8080
- [x] **CORS configured** for localhost:3000, 5173, 4173
- [x] **Rate limiting middleware** applied per endpoint

---

## Bugs & Fixes

### Critical

- [ ] **Sessions never expire** (`session.go`) — in-memory map only grows. No TTL, no cleanup goroutine, no cap. Abandoned sessions leak `*sql.DB` + `.db` file forever until OOM.
- [ ] **Rate limiter memory leak** (`limiter.go:12`) — `visitors` map gets permanent entry per IP, never pruned. Spoofed `X-Forwarded-For` headers can fill it.
- [x] **Race condition on Session fields** (`session.go:80`, `playground.go:93`) — `LastUsed` written after RLock released. `Schema.Tables` appended without any lock. Concurrent requests to same session = data race.

### High

- [ ] **No SQLite PRAGMAs** (`session.go:56`) — no WAL mode (readers block writers), no `busy_timeout` (SQLITE_BUSY instead of retry), no `foreign_keys=ON` (FK constraints ignored by SQLite).
- [ ] **DML has no context/timeout** (`execute.go:161-194`) — `ExecuteInsert/Update/Delete` call `sqlDB.Exec()` not `ExecContext()`. The 30s handler timeout never reaches DML.
- [ ] **Missing `rows.Err()` check** (`execute.go:57`) — after `rows.Next()` loop, partial results returned silently on mid-iteration errors.

### Medium

- [ ] **SQL identifiers not quoted** (`execute.go:80,121,136,153`) — table/column names interpolated raw via `fmt.Sprintf`. Should use `"%s"` quoting.
- [ ] **Cap RowsPerTable** (`generate.go:29`) — lower bound checked, no upper bound. Client can request millions of rows. Cap to 20.
- [ ] **Cap total sessions** (`session.go`) — `CreateSession` has no limit. Trivial DoS via `POST /playground/session` in a loop.
- [ ] **`ExecuteRaw` double-execute** (`execute.go:197-228`) — tries Query, then Insert, then Update, then Delete on failure. DML can execute multiple times.
- [ ] **`ensureUnique` infinite recursion** (`data.go:144`) — if value space < row count (e.g. unique BOOLEAN with 3+ rows), stack overflow.
- [ ] **CORS wildcards silently ignored** (`main.go:24-25`) — `gin-contrib/cors` needs `AllowWildcard: true` for `*.vercel.app` patterns.

### Low

- [ ] **`r.Run()` error discarded** (`main.go:42`) — if port is taken, app silently exits. Use `log.Fatal()`.
- [ ] **`UpdateSession` is a no-op** (`session.go:105`) — schema already mutated in-place via pointer. Only sets `LastUsed` which `GetSession` already does. Clarify or remove.
- [ ] **`PlaygroundMode.Close()` corrupts shared session** (`playground.go:174`) — closes `*sql.DB` on shared Session without removing from map. Not called today but a trap for future code.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Azure Container Apps setup.

---

## API Testing Commands

### QuickMode (Stateless)
```bash
# Health check
curl http://localhost:8080/health

# Full execution
curl -X POST http://localhost:8080/quick-run \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id"}'
```

### PlaygroundMode (Stateful)
```bash
# 1. Create session
SESSION=$(curl -X POST http://localhost:8080/playground/session | jq -r '.session_id')

# 2. Create table
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"}'

# 3. Insert data
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "INSERT INTO users (name) VALUES ('"'"'Alice'"'"'), ('"'"'Bob'"'"')"}'

# 4. Query data
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'

# 5. Get session info (check if valid)
curl http://localhost:8080/playground/session/$SESSION

# 6. Get session schema (all tables)
curl http://localhost:8080/playground/session/$SESSION/schema

# 7. Close session
curl -X DELETE http://localhost:8080/playground/session/$SESSION
```

---

## Status: ✅ COMPLETE

**Both QuickMode and PlaygroundMode are fully functional:**

### QuickMode
- ✅ SQL parsing via Vitess
- ✅ Schema inference from JOINs
- ✅ Schema inference from single-table SELECTs
- ✅ 100+ column type inference patterns
- ✅ PK/FK detection and type matching
- ✅ Fake data generation
- ✅ SQLite execution
- ✅ Aggregation support (COUNT, SUM, AVG, MIN, MAX)
- ✅ CREATE TABLE support
- ✅ Multi-statement execution
- ✅ Context timeouts
- ✅ Rate limiting
- ✅ Query guardrails

### PlaygroundMode
- ✅ Full CRUD support
- ✅ Session management with file-based SQLite
- ✅ Schema tracking
- ✅ Context timeouts
- ✅ RESTful API
- ✅ Rate limiting
- ✅ Query guardrails
- ✅ Table count limits
- ✅ Foreign key parsing from DDL (inline REFERENCES + table-level FOREIGN KEY)

### Frontend (apps/web/)
- ✅ CodeMirror 6 SQL editor with syntax highlighting
- ✅ SQL validation (parentheses, quotes, keywords, statement-specific checks)
- ✅ Run button disabled when SQL has validation errors
- ✅ Foreign key display in schema sidebar (blue badges showing FK → table)

### Infrastructure
- ✅ Request context timeouts (30 seconds)
- ✅ Clean package separation
- ✅ Per-IP rate limiting
- ✅ Query complexity guardrails
- ✅ Resource quotas
- ✅ Multi-statement attack prevention
- ✅ In-memory session management (map + mutex)
- ✅ Ready for containerized deployment

---

## Next Steps

1. **Fix critical bugs** (session expiry, rate limiter cleanup, race conditions)
2. **Set SQLite PRAGMAs** (WAL, busy_timeout, foreign_keys)
3. **Pass context to DML functions** (ExecContext)
4. **Add rows.Err() check, quote identifiers, cap rows/sessions**
5. **Fix ExecuteRaw double-execute + ensureUnique recursion**
6. **CORS wildcard fix**
7. **Azure Deployment**: Deploy to Azure Container Apps
8. **Custom Domain**: Use Namecheap free domain via GitHub Student
9. **Cloudflare**: Add DDoS protection and CDN
