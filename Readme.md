# Seeql

Seeql is a powerful SQL playground and schema visualizer that allows developers to prototype queries, visualize schemas, and generate mock data instantly. It features a unique "Quick Mode" that infers database schemas directly from SELECT queries and populates them with realistic mock data using an in-memory SQLite engine.

## Features

- **Quick Mode**: Instantly visualize data relationships by just writing a `SELECT` query. The system infers the schema, generates mock data, and executes the query.
- **Full Playground**: Define your schema with `CREATE TABLE` statements and run complex queries against a persistent in-memory session.
- **Schema Visualization**: Visual representation of tables, columns, and relationships.
- **Mock Data Generation**: Automatic generation of realistic data using `gofakeit` based on column names and types.
- **SQL Parsing**: Robust SQL parsing using `vitess` to understand complex queries and joins.

## Architecture


## Tech Stack

### Backend
- **Language**: Go 1.25+
- **Framework**: Gin Web Framework
- **SQL Parser**: Vitess
- **Database**: SQLite (In-Memory via `go-sqlite3`)
- **Data Generation**: gofakeit

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Tooling**: Biome

## Getting Started

### Prerequisites
- Go 1.25 or higher
- Node.js or Bun

### Backend Setup

1. Install Go dependencies:
   ```bash
   go mod download
   ```

2. Start the backend server:
   ```bash
   go run apps/api/main.go
   ```
   The server will start on `http://localhost:8080`.

### Frontend Setup

1. Navigate to the web directory:
   ```bash
   cd apps/web
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```
   The application will be available at `http://localhost:3000`.

## API Endpoints

### `POST /api/quick-run`
Analyzes a SELECT query, infers schema, generates data, and returns results.

**Request:**
```json
{
  "query": "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id"
}
```

**Response:**
```json
{
  "inferredSchema": {
    "tables": ["users", "orders"],
    "columns": { ... },
    "relationships": { ... }
  },
  "previewData": [ ... ],
  "sqlToExecute": "SELECT ..."
}
```

### `POST /api/schema`
Defines the database schema using CREATE statements.

**Request:**
```json
{
  "createStatements": [
    "CREATE TABLE users (id INT PRIMARY KEY, name TEXT)",
    "CREATE TABLE orders (id INT, user_id INT, total DECIMAL)"
  ]
}
```

## License

MIT
