package modes

import (
	"database/sql"
	"fmt"

	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/generator"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
	_ "github.com/mattn/go-sqlite3"
)

type QuickMode struct {
	parsedStmt any
	schema     *schema.Schema
	data       map[string][]map[string]any
	sqlDB      *sql.DB
}

func NewQuickMode() *QuickMode {
	return &QuickMode{
		data: make(map[string][]map[string]any),
	}
}

func (q *QuickMode) Run(query string) (*QueryResult, error) {
	ctx, err := q.Prepare(query)
	if err != nil {
		return nil, err
	}

	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		return nil, fmt.Errorf("failed to create database: %w", err)
	}
	q.sqlDB = sqlDB

	for _, table := range ctx.Schema.Tables {
		if err := db.CreateTable(sqlDB, &table); err != nil {
			return nil, fmt.Errorf("failed to create table %s: %w", table.Name, err)
		}
	}

	for tableName, rows := range ctx.Data {
		if err := db.InsertData(sqlDB, tableName, rows); err != nil {
			return nil, fmt.Errorf("failed to insert data into %s: %w", tableName, err)
		}
	}

	execResult, err := db.ExecuteQuery(sqlDB, query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	return &QueryResult{
		Columns:  execResult.Columns,
		Rows:     execResult.Rows,
		RowCount: execResult.RowCount,
		Schema:   ctx.Schema,
	}, nil
}

// parse, build schema, generate data, build result wrapper
func (q *QuickMode) Prepare(query string) (*QueryContext, error) {
	stmt, err := parser.Parse(query)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SQL: %w", err)
	}
	q.parsedStmt = stmt

	q.schema, err = schema.BuildSchema(stmt)
	if err != nil {
		return nil, fmt.Errorf("failed to build schema: %w", err)
	}

	gen := generator.New(q.schema)
	q.data = gen.GenerateData(5)

	return &QueryContext{
		ParsedStmt: q.parsedStmt,
		Schema:     q.schema,
		Data:       q.data,
	}, nil
}

func (q *QuickMode) GetSchema() (*schema.Schema, error) {
	if q.schema == nil {
		return nil, fmt.Errorf("no schema available")
	}
	return q.schema, nil
}

func (q *QuickMode) Close() error {
	if q.sqlDB != nil {
		return q.sqlDB.Close()
	}
	return nil
}
