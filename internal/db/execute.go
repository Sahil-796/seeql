package db

import (
	"database/sql"
	"fmt"

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

	var result []map[string]any
	for rows.Next() {
		values := make([]any, len(columns))
		valuePtr := make([]any, len(columns))

		for i := range values {
			valuePtr[i] = &values[i]
		}
		
		if err := rows.Scan(valuePtr...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		
		row := make(map[string]any)
		for i, col := range columns {
			row[col] = values[i]
		}
		result = append(result, row)
	}
	
	return &ExecutionResult{
		Columns: columns,
		Rows: result,
		RowCount: len(result),
	}, nil
}

func CreateTable(tables []schema.TableSchema, sqlDB *sql.DB) error {
	for _, table := range tables {
		query := fmt.Sprintf("CREATE TABLE %s (%v)", table.Name, table.Columns)
		if _, err := sqlDB.Exec(query); err != nil {
			return fmt.Errorf("failed to create table %s: %w", table.Name, err)
		}
	}
	return nil
}