<!-- markdownlint-disable MD041 -->
<p align="center">
  <img src="https://via.placeholder.com/120x120?text=SQL" alt="Seeql Logo" />
</p>

<h1 align="center">Seeql</h1>

<p align="center">
  A SQL playground which let's user execute SQL queries. 
</p>
<p align="center">
    An interactive tool made in go to quickly run and learn SQL. It features 2 modes: quick and playground whose description can be found in this documentation. 
</p>
<p align="center">
  <a href="https://seeql-one.vercel.app">
    <img src="https://img.shields.io/badge/web-visit-brightgreen" alt="Live Demo" />
  </a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Modes](#modes)
  - [Quick Mode](#quick-mode)
  - [Playground Mode](#playground-mode)
- [Getting Started](#getting-started)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [API Reference](#api-reference)
  - [Quick Run](#quick-run)
  - [Playground Session](#playground-session)
- [How It Works](#how-it-works)
- [Features](#features)
- [Limitations](#limitations)
- [Deployment](#deployment)
- [Stack](#stack)
- [License](#license)

---

## Overview

Seeql is a SQL learning, testing and prototyping tool with two execution modes. Write a SELECT query and get instant results with realistic mock data, or create a persistent session for full CRUD operations.

```sql
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id
```

```
→ Generates users and orders tables with realistic mock data
→ Executes your query against an in-memory SQLite database
→ Returns results for preview
```

**Live demo**: [https://seeql-one.vercel.app](https://seeql-one.vercel.app)

---

## Modes: the neat part

### Playground Mode

Playground Mode provides a persistent session with full SQL support: CREATE TABLE, INSERT, UPDATE, DELETE, and SELECT with constraints, aggregations etc. Each session gets its own SQLite database file that persists until you close the session.

Ideal for:
- Multi-step workflows
- Schema design iteration
- Teaching SQL interactively

### Quick Mode

Quick Mode is stateless. Write any SELECT query, Seeql parses it, infers the schema from column names and JOINs, generates realistic mock data, and executes the query against an in-memory SQLite database.

Ideal for:
- Quick SQL prototyping
- Testing queries without setup
- Exploring JOINs and aggregations


---

## Getting Started

### Backend

```bash
go mod download
go run apps/api/main.go
```

The API server runs on `http://localhost:8080`.

### Frontend

```bash
cd apps/web
bun install
bun run dev
```

The web interface runs on `http://localhost:3000`.

---

## API Reference

### Quick Run

Execute a SELECT query with auto-generated mock data.

**Endpoint**: `POST /quick-run`

```bash
curl -X POST http://localhost:8080/quick-run \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT name, email FROM users WHERE active = 1"}'
```

**Response**:

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

### Playground Session

Create a persistent session for multi-statement workflows.

#### Create Session

**Endpoint**: `POST /playground/session`

```bash
curl -X POST http://localhost:8080/playground/session
```

Response:

```json
{
  "session_id": "abc-123-def-456",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Execute Query

**Endpoint**: `POST /playground/session/:id/execute`

```bash
# Create table
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"}'

# Insert data
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": \"INSERT INTO users (name) VALUES ('\''Alice'\''), ('\''Bob'\'')\"}'

# Query data
curl -X POST http://localhost:8080/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'
```

#### Close Session

**Endpoint**: `DELETE /playground/session/:id`

```bash
curl -X DELETE http://localhost:8080/playground/session/$SESSION
```

---

## How It Works

1. **Parse** – The Vitess SQL parser extracts tables, columns, and JOINs from your query
2. **Infer** – Column names hint at types (`email` → TEXT, `is_active` → BOOLEAN, `created_at` → TIMESTAMP)
3. **Generate** – gofakeit creates realistic mock data matching the inferred types
4. **Execute** – An in-memory SQLite database runs your query
5. **Return** – Results are returned as JSON with columns and rows

---

## Features

- Smart type inference from 100+ column name patterns (price, url, uuid, phone, etc.)
- Foreign key relationship inference from `_id` suffixes
- Support for aggregations: COUNT, SUM, AVG, MIN, MAX
- Multi-statement execution (Quick Mode)
- Full CRUD support (Playground Mode)
- 30-second query timeout
- Rate limiting per endpoint

---

## Limitations

Seeql uses SQLite for query execution and Vitess for SQL parsing. Some database-specific features are not supported:

- **PostgreSQL-specific functions**: `array_agg()`, `json_agg()`, `to_char()`, `generate_series()`, window functions with custom frames
- **MySQL-specific functions**: `GROUP_CONCAT()`, `FIND_IN_SET()`, `ELT()`, `EXPORT_SET()`
- **Data types**: JSON, ARRAY, HSTORE, UUID (native), BYTEA, geometric types
- **Advanced SQL**: CTEs (WITH clauses), recursive queries, FULL OUTER JOIN, subqueries in FROM

The parser supports standard SQL SELECT, INSERT, UPDATE, DELETE, and CREATE TABLE statements. If you need PostgreSQL or MySQL compatibility, consider executing queries directly against your target database.

---

## Deployment

### Docker

Build and run locally:

```bash
docker build -t seeql .
docker run -p 8080:8080 seeql
```

### Cloud Deployment

Seeql is deployed on:

- **API**: [Azure Container Apps](https://azure.microsoft.com/services/container-apps/) (registry: [Docker Hub](https://hub.docker.com/r/yourusername/seeql))
- **Web**: [Vercel](https://vercel.com) at [https://seeql-one.vercel.app](https://seeql-one.vercel.app)



---

## Stack

- **Backend**: Go, Gin, Vitess (SQL parser), SQLite, gofakeit
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, CodeMirror 6

---

## Give it a star if you think it's useful!
## I like stars on my repo

---

## License

MIT License. See [LICENSE](LICENSE) for details.
