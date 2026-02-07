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
	// Check if it's a CREATE TABLE statement
	if parser.IsCreateTable(query) {
		return q.prepareFromDDL(query)
	}

	// Otherwise use inferred schema
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

// prepareFromDDL handles CREATE TABLE statements
func (q *QuickMode) prepareFromDDL(query string) (*QueryContext, error) {
	createTable, err := parser.ParseCreateTable(query)
	if err != nil {
		return nil, fmt.Errorf("failed to parse CREATE TABLE: %w", err)
	}
	q.parsedStmt = createTable

	parsedDDL, err := parser.ExtractSchemaFromDDL(createTable)
	if err != nil {
		return nil, fmt.Errorf("failed to extract schema from DDL: %w", err)
	}

	// Convert ParsedDDL to schema.Schema
	q.schema = convertParsedDDLToSchema(parsedDDL)

	// For CREATE TABLE statements, we don't generate data yet
	// (user would need to run INSERT or SELECT after)
	q.data = make(map[string][]map[string]any)

	return &QueryContext{
		ParsedStmt: q.parsedStmt,
		Schema:     q.schema,
		Data:       q.data,
	}, nil
}

// convertParsedDDLToSchema converts parser.ParsedDDL to schema.Schema
func convertParsedDDLToSchema(parsed *parser.ParsedDDL) *schema.Schema {
	tableSchema := schema.TableSchema{
		Name:    parsed.TableName,
		Columns: make([]schema.ColumnSchema, 0, len(parsed.Columns)),
	}

	for _, col := range parsed.Columns {
		tableSchema.Columns = append(tableSchema.Columns, schema.ColumnSchema{
			Name:      col.Name,
			Type:      col.Type,
			Nullable:  col.Nullable,
			IsPrimary: col.IsPrimary,
			Constraints: schema.Constraints{
				Unique: col.IsUnique,
			},
		})
	}

	return &schema.Schema{
		Tables:        []schema.TableSchema{tableSchema},
		Relationships: nil,
	}
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
