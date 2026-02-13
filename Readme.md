# seeql

A SQL playground that generates mock data from queries. No database setup, no schema definition—just write SQL and see results instantly.

```
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id

→ Generates users table with fake data
→ Generates orders table with fake data  
→ Executes your query
→ Returns results in ~50ms
```

## What It Does

**Quick Mode**: Write any SELECT query. seeql parses it, infers the schema from column names and JOINs, generates realistic mock data, and executes the query against an in-memory SQLite database.

**Playground Mode**: Full persistent session with CREATE TABLE, INSERT, UPDATE, DELETE. Like a temporary database that lives for your session.

## Why

Testing SQL without real data is frustrating. Setting up fixtures is tedious. seeql lets you prototype queries instantly with realistic data inferred from your column names (`email` → realistic emails, `created_at` → timestamps, `price` → decimal amounts).

## Quick Start

### Backend

```bash
go mod download
go run apps/api/main.go
```

API runs on `localhost:8080`.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

App runs on `localhost:3000`.

## API

### POST /quick-run

Instant query execution with auto-generated data.

```bash
curl -X POST http://localhost:8080/quick-run \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT name, email FROM users WHERE active = 1"}'
```

Response:
```json
{
  "columns": ["name", "email"],
  "rows": [
    {"name": "Alice Smith", "email": "alice@example.com"},
    {"name": "Bob Jones", "email": "bob@company.org"}
  ],
  "row_count": 2
}
```

### POST /playground/session

Create a persistent session.

```bash
# Create session
SESSION=$(curl -s -X POST http://localhost:8080/playground/session | jq -r '.session_id')

# Create table
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -d '{"sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"}'

# Insert
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -d '{"sql": "INSERT INTO users (name) VALUES ('"'"'Alice'"'"')"}'

# Query
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -d '{"sql": "SELECT * FROM users"}'

# Cleanup
curl -X DELETE http://localhost:8080/playground/session/$SESSION
```

## How It Works

1. **Parse**: Vitess SQL parser extracts tables, columns, JOINs
2. **Infer**: Column names hint at types (`email`→TEXT, `is_active`→BOOLEAN, `created_at`→TIMESTAMP)
3. **Generate**: gofakeit creates realistic data matching those types
4. **Execute**: SQLite in-memory database runs your query
5. **Return**: JSON with columns, rows, and inferred schema

## Features

- **Smart type inference**: 100+ column name patterns (price, url, uuid, phone, etc.)
- **JOIN support**: Foreign key relationships inferred from `_id` suffixes
- **Aggregations**: COUNT, SUM, AVG, MIN, MAX
- **Multi-statement**: Run multiple SQL statements separated by semicolons
- **Timeouts**: 30-second query limit to prevent runaway queries

## Stack

- **Backend**: Go, Gin, Vitess (SQL parsing), SQLite, gofakeit
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4

## Development

```bash
# Run tests
go test ./...

# Run backend only
go run apps/api/main.go

# Run frontend only
cd apps/web && npm run dev
```

## License

MIT
