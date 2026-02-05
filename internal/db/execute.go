package db

import (
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

func ExecuteQuery(sqlDB *sql.DB, query string) (*ExecutionResult, error) {

	rows, err := sqlDB.Query(query)
	// rows has .Scan .Next and .Columns functions
	// rows is jsut a ptr to the result after sqlite executes the query

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
		sqlType := col.Type
		if sqlType == "" {
			sqlType = "TEXT"
		}
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
