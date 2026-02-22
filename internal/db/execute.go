package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/Sahil-796/seeql/internal/schema"
	_ "github.com/mattn/go-sqlite3"
)

type ExecutionResult struct {
	Columns  []string
	Rows     []map[string]any
	RowCount int
}

func ConfigureSQLite(sqlDB *sql.DB) error {
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA busy_timeout=5000",
		"PRAGMA foreign_keys=ON",
	}
	for _, p := range pragmas {
		if _, err := sqlDB.Exec(p); err != nil {
			return fmt.Errorf("failed to set %s: %w", p, err)
		}
	}
	return nil
}

func ExecuteQuery(ctx context.Context, sqlDB *sql.DB, query string) (*ExecutionResult, error) {
	// Validate SELECT-specific query (includes length, dangerous patterns, JOIN count)
	if err := ValidateSelectQuery(query); err != nil {
		return nil, err
	}

	// Add LIMIT if not present
	query = AddRowLimit(query)

	rows, err := sqlDB.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
	}

	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	var results []map[string]any
	for rows.Next() {
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		row := make(map[string]any)
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	return &ExecutionResult{
		Columns:  columns,
		Rows:     results,
		RowCount: len(results),
	}, nil
}

func CreateTable(sqlDB *sql.DB, table *schema.TableSchema) error {
	var cols []string
	for _, col := range table.Columns {
		sqlType := mapToSQLiteType(col.Type)
		colDef := fmt.Sprintf("%s %s", col.Name, sqlType)
		if col.IsPrimary {
			colDef += " PRIMARY KEY"
		}
		if !col.Nullable {
			colDef += " NOT NULL"
		}
		cols = append(cols, colDef)
	}

	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s)", table.Name, strings.Join(cols, ", "))
	_, err := sqlDB.Exec(query)
	return err
}

// mapToSQLiteType converts semantic types to SQLite storage types
func mapToSQLiteType(semanticType string) string {
	switch semanticType {
	case "INTEGER":
		return "INTEGER"
	case "FLOAT", "REAL":
		return "REAL"
	case "BOOLEAN":
		return "INTEGER" // SQLite has no boolean, uses 0/1
	case "DATE", "TIMESTAMP":
		return "TEXT" // ISO 8601 format
	case "TEXT", "VARCHAR", "EMAIL", "URL", "UUID":
		return "TEXT"
	case "JSON":
		return "TEXT" // SQLite can store JSON as TEXT
	default:
		return "TEXT"
	}
}

func InsertData(sqlDB *sql.DB, tableName string, rows []map[string]any) error {
	if len(rows) == 0 {
		return nil
	}

	for _, row := range rows {
		var cols []string
		var placeholders []string
		var values []any

		for col, val := range row {
			cols = append(cols, col)
			placeholders = append(placeholders, "?")
			values = append(values, val)
		}

		query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			tableName,
			strings.Join(cols, ", "),
			strings.Join(placeholders, ", "))

		if _, err := sqlDB.Exec(query, values...); err != nil {
			return fmt.Errorf("failed to insert into %s: %w", tableName, err)
		}
	}

	return nil
}

// GetTableColumns returns the column names for a given table
func GetTableColumns(ctx context.Context, sqlDB *sql.DB, tableName string) ([]string, error) {
	rows, err := sqlDB.QueryContext(ctx, fmt.Sprintf("SELECT * FROM %s LIMIT 0", tableName))
	if err != nil {
		return nil, fmt.Errorf("failed to get table info: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	return columns, nil
}

// AddColumn adds a new column to an existing table
func AddColumn(sqlDB *sql.DB, tableName string, col *schema.ColumnSchema) error {
	sqlType := mapToSQLiteType(col.Type)
	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, col.Name, sqlType)
	_, err := sqlDB.Exec(query)
	return err
}

// DIRECT .EXEC CALLS -----------------------------------------------------------

// ExecuteInsert executes an INSERT statement and returns the number of affected rows
func ExecuteInsert(sqlDB *sql.DB, query string) (int64, error) {
	if err := ValidateQuery(query); err != nil {
		return 0, err
	}
	result, err := sqlDB.Exec(query)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ExecuteUpdate executes an UPDATE statement and returns the number of affected rows
func ExecuteUpdate(sqlDB *sql.DB, query string) (int64, error) {
	if err := ValidateQuery(query); err != nil {
		return 0, err
	}
	result, err := sqlDB.Exec(query)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ExecuteDelete executes a DELETE statement and returns the number of affected rows
func ExecuteDelete(sqlDB *sql.DB, query string) (int64, error) {
	if err := ValidateQuery(query); err != nil {
		return 0, err
	}
	result, err := sqlDB.Exec(query)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ExecuteRaw attempts to execute a query as a SELECT, or falls back to DML execution if it fails
func ExecuteRaw(ctx context.Context, sqlDB *sql.DB, query string) (*ExecutionResult, error) {
	// Try as SELECT first
	result, err := ExecuteQuery(ctx, sqlDB, query)
	if err != nil {
		// Fall back to DML execution for INSERT/UPDATE/DELETE
		// Try INSERT first
		rowsAffected, execErr := ExecuteInsert(sqlDB, query)
		if execErr == nil {
			return &ExecutionResult{
				RowCount: int(rowsAffected),
			}, nil
		}

		// Try UPDATE
		rowsAffected, execErr = ExecuteUpdate(sqlDB, query)
		if execErr == nil {
			return &ExecutionResult{
				RowCount: int(rowsAffected),
			}, nil
		}

		// Try DELETE
		rowsAffected, execErr = ExecuteDelete(sqlDB, query)
		if execErr == nil {
			return &ExecutionResult{
				RowCount: int(rowsAffected),
			}, nil
		}

		return nil, err
	}
	return result, nil
}
