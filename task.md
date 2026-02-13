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
  - `SessionManager`: Manages multiple sessions with file-based SQLite
  - `CreateSession()` → Creates new session with UUID
  - `GetSession(id)` → Retrieve session by ID
  - `CloseSession(id)` → Close and cleanup session
  - `CleanupOldSessions(maxAge)` → Remove inactive sessions
  - `getDBPath()` → Returns file path for session database

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
  - `GetSchema()` → Returns current session schema
  - `Close()` → Closes session database

### API Handlers (`apps/api/handlers/`)
- [x] **health.go**: `GET /health` → Status OK
- [x] **health_test.go**: Tests for health endpoint
- [x] **schema.go**: `POST /infer` → Parse SQL → Return schema
- [x] **schema_test.go**: Tests for schema endpoint
- [x] **generate.go**: `POST /generate` → Parse → Schema → Generate data → Return data
- [x] **generate_test.go**: Tests for generate endpoint
- [x] **quick_run.go**: `POST /quick-run` (fully implemented)
  - Request: `{ "sql": "..." }`
  - **NEW**: Context timeout (30 seconds)
  - **NEW**: Multi-statement support (statements separated by `;`)
  - **NEW**: CREATE TABLE support - users can define explicit schemas
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
- [x] **routes.go**: Setup routes
  - `POST /infer`, `POST /generate`, `POST /quick-run`
  - `POST /playground/session`
  - `DELETE /playground/session/:id`
  - `POST /playground/session/:id/execute`
  - `GET /health`

### Main Application (`apps/api/`)
- [x] **main.go**: Gin server on :8080
- [x] **CORS configured** for localhost:3000, 5173, 4173

## Recently Completed ✅

### 1. ✅ Context Timeouts (NEW)
**Files**: All execution functions in `internal/db/`, `internal/modes/`, `apps/api/handlers/`

**Changes**:
- All DB operations now accept `context.Context`
- Handlers create contexts with 30-second timeout
- Prevents hanging queries and resource exhaustion

```go
// Handler
ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
defer cancel()
result, err := mode.Run(ctx, query)
```

### 2. ✅ PlaygroundMode Complete (NEW)
**Status**: Fully implemented and working

**Features**:
- Full CRUD support: CREATE TABLE, SELECT, INSERT, UPDATE, DELETE
- Session-based persistence (file-based SQLite)
- Schema tracking across multiple queries
- Context timeout support
- RESTful API endpoints

**API Endpoints**:
```bash
# Create session
POST /playground/session
# Returns: { "session_id": "uuid", "created_at": "..." }

# Execute query
POST /playground/session/:id/execute
# Body: { "sql": "SELECT * FROM users" }
# Returns: QueryResult with columns, rows, schema

# Close session
DELETE /playground/session/:id
```

### 3. ✅ Schema Extraction from DDL
**Files**: `internal/modes/playground.go`

Uses `parser.ExtractSchemaFromDDL()` to convert parsed CREATE TABLE statements to schema.TableSchema, avoiding confusing [0] indexing.

### 4. ✅ Clean Architecture
- Package `db`: All database operations with context support
- Package `modes`: High-level orchestration
- Package `parser`: SQL parsing (no DB dependencies)
- Package `schema`: Schema definitions

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Azure Container Apps + Redis setup.

---

## API Testing Commands

### QuickMode (Stateless)
```bash
# Health check
curl http://localhost:8080/health

# Infer schema
curl -X POST http://localhost:8080/infer \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT id, name, email FROM users"}'

# Generate data
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT id, name FROM users"}'

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

# 5. Close session
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

### PlaygroundMode
- ✅ Full CRUD support
- ✅ Session management with file-based SQLite
- ✅ Schema tracking
- ✅ Context timeouts
- ✅ RESTful API

### Infrastructure
- ✅ Request context timeouts (30 seconds)
- ✅ Clean package separation
- ✅ Ready for containerized deployment with Redis

---

## Next Steps (Optional)

1. **Redis Integration**: Replace in-memory session map with Redis for stateless containers
2. **Azure Deployment**: Deploy to Azure Container Apps with Azure Cache for Redis
3. **Custom Domain**: Use Namecheap free domain via GitHub Student
4. **Cloudflare**: Add DDoS protection and CDN

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## System Design Improvements (NEW)

### High Priority (Must-Haves)

#### 1. Rate Limiting
- [ ] Implement token bucket rate limiting per IP
- [ ] Apply to `/quick-run` and playground endpoints
- [ ] Different limits: `/quick-run` (stricter), playground session ops (relaxed)
- [ ] Return 429 with Retry-After header

#### 2. Query Complexity Guardrails
- [ ] Max execution time (already have 30s timeout, but needs enforcement)
- [ ] Max rows returned per query (e.g., 1000)
- [ ] Block dangerous patterns: `generate_series`, recursive CTEs without limits
- [ ] Query size limits (max characters)

#### 3. Resource Quotas Per Session
- [ ] Max tables per playground session (e.g., 50)
- [ ] Max rows stored across all tables (e.g., 10000)
- [ ] Max session lifetime (e.g., 1 hour)
- [ ] Cleanup old sessions automatically

### Medium Priority (Nice-to-Haves)

#### 4. Request Deduplication
- [ ] Prevent double-clicks from executing same query twice
- [ ] In-flight request tracking with SQL hash as key
- [ ] Return existing result if same query is already running

#### 5. Circuit Breaker Pattern
- [ ] Track SQLite failure rates
- [ ] Open circuit after N failures in time window
- [ ] Fast-fail with 503 when circuit is open
- [ ] Auto-recovery after cooldown period

### Low Priority (Observability)

#### 6. Prometheus Metrics
- [ ] Query execution duration histogram
- [ ] Error rates by type (syntax, timeout, runtime)
- [ ] Active sessions gauge
- [ ] Rate limit hits counter

#### 7. Graceful Shutdown
- [ ] Drain in-flight requests on SIGTERM
- [ ] Save session state before shutdown (optional)
- [ ] Kubernetes-friendly shutdown handling

### Notes

- **No job queues needed** - queries are real-time, user waits for result
- Caching not needed - responses are always different (random data generation)
- Focus on protecting SQLite from abuse and resource exhaustion
