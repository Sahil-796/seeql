# Seeql Implementation Progress

## Architecture Overview
Seeql is a SQL testing/debugging tool with two modes:
- **QuickMode**: Parse SELECT → Infer schema → Generate fake data → Execute query on SQLite
- **PlaygroundMode**: Real database with session management (future feature)

## Completed Components

### Parser Package (`internal/parser/`)
- [x] **parser.go**: SQL parsing using Vitess
  - `Parse(sql string)` → returns `sqlparser.Statement`
- [x] **tables.go**: Extract table aliases and names from SELECT
  - `ExtractTables(stmt)` → map[alias]realName
- [x] **columns.go**: Extract columns per table
  - `ExtractColumns(stmt, aliases)` → map[table][]columns
- [x] **joins.go**: Extract JOIN relationships
  - `ExtractJoins(stmt, aliases)` → []Join with table relationships
- [x] **parser_test.go**: Basic test coverage

### Schema Package (`internal/schema/`)
- [x] **types.go**: Core schema types
  - `ColumnSchema`: Name, Type, Nullable, IsPrimary, IsForeign, RefTable, RefColumn, Constraints
  - `TableSchema`: Name, Columns
  - `Schema`: Tables, Relationships
  - `Constraints`: MaxLength, Min, Max, Unique
- [x] **builder.go**: Build schema from parsed SQL
  - `BuildSchema(stmt)` → Infers PK (id columns), FK (ends with _id), relationships from JOINs
  - `inferReferencedTable()` → Matches prefixes to table names (handles pluralization)

### Generator Package (`internal/generator/`)
- [x] **data.go**: Generate fake data based on schema
  - `Generator` struct with RNG and Faker
  - `GenerateData(rowsPerTable)` → map[table][]rows
  - `GenerateColumnValue()` → Type-aware fake values (TEXT, INTEGER, FLOAT, BOOLEAN, DATE, TIMESTAMP, UUID, JSON, EMAIL, URL)
  - Handles PK/FK relationships, NULLABLE, UNIQUE constraints
  - Uses `gofakeit/v7` for realistic data

### DB Package (`internal/db/`)
- [x] **sqlite.go**: SQLite initialization
  - `Init()` → Creates in-memory SQLite DB
- [x] **execute.go**: Query execution, table creation, and data insertion
  - `ExecuteQuery(db, query)` → Execute and return results with columns
  - `CreateTable(db, table)` → CREATE TABLE with PK, FK, NULL constraints
  - `InsertData(db, tableName, rows)` → Insert generated data into tables
  - **NOTE**: Type defaults to TEXT when column.Type is empty
- [ ] **session.go**: Empty (for PlaygroundMode)

### Modes Package (`internal/modes/`)
- [x] **interface.go**: ExecutionMode interface
  - `Run(query)` → QueryResult
  - `GetSchema()` → Schema
  - `Close()` → error
  - `QueryContext`, `QueryResult` structs
  - `NewMode(mode)` → Factory function
- [x] **quick.go**: Complete QuickMode implementation
  - Structure: parsedStmt, schema, data, sqlDB
  - `NewQuickMode()` → Constructor
  - `Prepare(query)` → Parse → BuildSchema → GenerateData
  - `Run(query)` → Open DB → Create tables → Insert data → Execute query → Return results ✓
  - `GetSchema()` → Returns cached schema
  - `Close()` → Closes sqlDB connection
- [ ] **playground.go**: Empty file

### API Handlers (`apps/api/handlers/`)
- [ ] **health.go**: `GET /health` → Status OK
- [x] **schema.go**: `POST /infer` → Parse SQL → Return schema
- [x] **generate.go**: `POST /generate` → Parse → Schema → Generate data → Return data
- [x] **quick_run.go**: `POST /quick-run` (fully implemented)
  - Request: `{ "sql": "..." }`
  - Uses `modes.NewMode()` → `mode.Run()` → Returns QueryResult
  - Error handling: 400 for bad request, 500 for internal errors

### Routes (`apps/api/routes/`)
- [ ] **routes.go**: Setup routes
  - `POST /infer`, `POST /generate`, `GET /health`
  - **MISSING**: `POST /quick-run` endpoint (add: `r.POST("/quick-run", handlers.QuickRun)`)

### Main Application (`apps/api/`)
- [x] **main.go**: Gin server on :8080

## Remaining Tasks

### 1. Add /quick-run Route
**Location**: `apps/api/routes/routes.go:12`

**Add**:
```go
r.POST("/quick-run", handlers.QuickRun)
```

### 2. Handle Empty Column Types
**Issue**: `schema.BuildSchema()` doesn't infer column types from SELECT queries, so ColumnSchema.Type is empty

**Current behavior**: `CreateTable()` defaults to TEXT
**Better solution**: Infer types based on:
- Column name patterns (id → INTEGER, email → TEXT, etc.)
- Or add support for CREATE TABLE statements with explicit types
- Or default types: id columns → INTEGER, others → TEXT

## Testing Checklist

### Unit Tests
- [x] Parser tests (parser_test.go exists)
- [ ] Schema builder tests
- [ ] Data generator tests
- [ ] DB operations tests (CreateTable, InsertData, ExecuteQuery)
- [ ] QuickMode integration tests

### Integration Tests
- [ ] Test /quick-run with simple SELECT
- [ ] Test /quick-run with JOIN
- [ ] Test /quick-run with WHERE clause
- [ ] Test /quick-run with aggregation (COUNT, SUM)
- [ ] Test error handling (invalid SQL, missing tables)

## Quick Wins (Do These First)

1. **Add /quick-run route** - One line addition in routes.go
2. **Test end-to-end** - Verify it works with a simple query
3. **Fix column type inference** - Default id columns to INTEGER

## Future Enhancements

### PlaygroundMode
- [ ] Session management (create isolated DB per session)
- [ ] Multi-query support (multiple CREATE TABLE, INSERT, SELECT)
- [ ] Schema migrations
- [ ] Query history
- [ ] Export results (CSV, JSON)

### Features
- [ ] Support CREATE TABLE statements directly
- [ ] Better type inference from column names
- [ ] Query result pagination
- [ ] Session persistence (save/load queries)
- [ ] Custom data generators (templates)
- [ ] API rate limiting

### Testing & Quality
- [ ] Add comprehensive unit tests
- [ ] Add integration tests
- [ ] Add benchmarks for data generation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Frontend integration

## Dependencies Already Installed
- `github.com/gin-gonic/gin` - HTTP framework
- `vitess.io/vitess` - SQL parsing
- `github.com/brianvoe/gofakeit/v7` - Fake data generation
- `github.com/mattn/go-sqlite3` - SQLite driver

## Next Steps Priority Order

1. 🔴 **HIGH**: Add `POST /quick-run` route in `routes.go`
2. 🟡 **MEDIUM**: Test end-to-end with sample query
3. 🟡 **MEDIUM**: Fix column type inference (default id → INTEGER)
4. 🟢 **LOW**: Add more unit tests
5. 🟢 **LOW**: Documentation and API specs

## Sample Test Query

```bash
curl -X POST http://localhost:8080/quick-run \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id"
  }'
```

Expected response:
```json
{
  "columns": ["name", "amount"],
  "rows": [
    {"name": "John Doe", "amount": 150.00},
    {"name": "Jane Smith", "amount": 230.50}
  ],
  "row_count": 2,
  "schema": {
    "tables": [...],
    "relationships": [...]
  }
}
```

## Notes

- QuickMode is **stateless** - new SQLite DB per request
- Data is **regenerated** on each request (not cached)
- Schema inference works on **column names only** (not types)
- Foreign key inference based on `_id` suffix convention
- Primary key inference based on `id` column name
- Column type currently defaults to TEXT in SQLite
- QuickMode now properly manages DB lifecycle (open → use → close)
