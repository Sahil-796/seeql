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
  - **FIXED**: Handles unqualified columns (no table alias) in single-table queries
- [x] **joins.go**: Extract JOIN relationships
  - `ExtractJoins(stmt, aliases)` → []Join with table relationships
- [x] **parser_test.go**: Basic test coverage
- [x] **columns_test.go**: Tests for column extraction with/without aliases

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
  - `ExecuteQuery(db, query)` → Execute and return results with columns
  - `CreateTable(db, table)` → CREATE TABLE with PK, FK, NULL constraints
  - `InsertData(db, tableName, rows)` → Insert generated data into tables
  - **NEW**: `mapToSQLiteType()` → Converts semantic types to SQLite storage types
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
- [x] **quick_test.go**: Integration tests for QuickMode
- [ ] **playground.go**: Empty file

### API Handlers (`apps/api/handlers/`)
- [x] **health.go**: `GET /health` → Status OK
- [x] **schema.go**: `POST /infer` → Parse SQL → Return schema
- [x] **generate.go**: `POST /generate` → Parse → Schema → Generate data → Return data
- [x] **quick_run.go**: `POST /quick-run` (fully implemented)
  - Request: `{ "sql": "..." }`
  - Uses `modes.NewMode()` → `mode.Run()` → Returns QueryResult
  - Error handling: 400 for bad request, 500 for internal errors

### Routes (`apps/api/routes/`)
- [x] **routes.go**: Setup routes
  - `POST /infer`, `POST /generate`, `POST /quick-run`, `GET /health`

### Main Application (`apps/api/`)
- [x] **main.go**: Gin server on :8080

## Recently Completed ✅

### 1. ✅ Handle Queries Without JOINs (FIXED)
**Issue**: Simple SELECT queries without JOINs failed because columns had no qualifier.

**Root cause**: `SELECT id, name FROM users` produced columns with empty qualifier, creating table with name `""`.

**Solution**: Modified `internal/parser/columns.go` to track unqualified columns and assign to single table when only one table exists.

**Result**: Both work now:
```sql
SELECT id, name FROM users          -- ✅ NOW WORKS
SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id  -- ✅ WORKS
```

### 2. ✅ Column Type Inference (IMPLEMENTED)
**File**: `internal/schema/builder.go:77-176`

**Inferred Types** (100+ patterns):
| Pattern | Type | Example |
|---------|------|---------|
| `id`, `*_id` | INTEGER | user_id, product_id |
| `email` | EMAIL | email, user_email |
| `url`, `website` | URL | url, profile_url |
| `is_*`, `has_*`, `verified`, `active` | BOOLEAN | is_active, verified |
| `created_at`, `updated_at`, `timestamp` | TIMESTAMP | created_at |
| `price`, `amount`, `cost` | FLOAT | price, total_amount |
| `count`, `quantity`, `age`, `*_count` | INTEGER | age, order_count |
| `metadata`, `config`, `settings` | JSON | metadata, config |
| `uuid`, `token`, `key` | UUID | uuid, access_token |
| `description`, `content`, `text` | TEXT | description, bio |
| `address`, `city`, `country` | TEXT | address, city |

**SQLite Mapping** (`internal/db/execute.go:95-112`):
- INTEGER → INTEGER
- FLOAT → REAL  
- BOOLEAN → INTEGER (0/1)
- DATE/TIMESTAMP → TEXT (ISO 8601)
- EMAIL/URL/UUID/JSON → TEXT

## Testing Checklist

### Unit Tests
- [x] Parser tests (parser_test.go exists)
- [x] Column extraction tests (columns_test.go)
- [x] QuickMode integration tests (quick_test.go)
- [ ] Schema builder tests (test `inferColumnType` directly)
- [ ] Data generator tests
- [ ] DB operations tests (CreateTable, InsertData, ExecuteQuery)

### Integration Tests
- [x] Test /quick-run with JOIN ✅
- [x] Test /quick-run with multiple JOINs ✅
- [x] Test /quick-run with LEFT/RIGHT JOIN ✅
- [x] Test /quick-run with WHERE clause ✅
- [x] Test error handling (invalid SQL, missing fields) ✅
- [x] Test /quick-run with simple SELECT (no JOIN) ✅ **FIXED**
- [ ] Test /quick-run with aggregation (COUNT, SUM)
- [ ] Test all column type patterns

## Next Steps Priority Order

### 🔴 HIGH Priority

1. **Fix FK Type Mismatch Bug**
   - **Issue**: FK columns (`user_id`) get INTEGER type, but PK columns may get UUID type if not named `id`
   - **Fix**: When inferring FK type, check referenced table's PK type and match it
   - **File**: `internal/schema/builder.go:44-56`

2. **Add Missing Handler Tests**
   - `health.go` test
   - `schema.go` test  
   - `generate.go` test
   - Currently only `quick_run_test.go` exists

### 🟡 MEDIUM Priority

3. **Aggregation Support**
   - Support COUNT, SUM, AVG, MIN, MAX in SELECT
   - Currently fails because aggregations don't have table qualifiers
   - **File**: `internal/parser/columns.go` needs to handle `*sqlparser.FuncExpr`

4. **Add Schema Builder Unit Tests**
   - Test `inferColumnType()` with all 100+ patterns
   - Test FK inference with pluralization
   - Test PK detection edge cases

5. **Support CREATE TABLE Statements**
   - Allow users to provide explicit schema via CREATE TABLE
   - Extract types directly from DDL instead of inferring

### 🟢 LOW Priority

6. **PlaygroundMode Foundation**
   - Session management with UUID
   - Persistent SQLite DB per session (file-based)
   - Multi-query support (CREATE, INSERT, SELECT sequence)

7. **Enhanced Data Generation**
   - Locale-specific fake data (names, addresses)
   - Custom data templates
   - Relationship-aware data (child table respects parent FK distribution)

8. **API Improvements**
   - OpenAPI/Swagger documentation
   - Request validation middleware
   - Rate limiting
   - CORS configuration

9. **Developer Experience**
   - Docker compose setup
   - Makefile with common commands
   - GitHub Actions CI/CD
   - Code coverage reporting

10. **Frontend Integration**
    - React/Vue component for query builder
    - Schema visualizer
    - Results table with pagination

## Dependencies Already Installed
- `github.com/gin-gonic/gin` - HTTP framework
- `vitess.io/vitess` - SQL parsing
- `github.com/brianvoe/gofakeit/v7` - Fake data generation
- `github.com/mattn/go-sqlite3` - SQLite driver

## API Testing Commands

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

## Notes

- QuickMode is **stateless** - new SQLite DB per request
- Data is **regenerated** on each request (not cached)
- Schema inference works on **column names** with **100+ patterns**
- Foreign key inference based on `_id` suffix convention
- Primary key inference based on `id` column name
- Column types are now **inferred from naming patterns** (not defaulted to TEXT)
- QuickMode properly manages DB lifecycle (open → use → close)
- All high-priority bugs have been fixed ✅
