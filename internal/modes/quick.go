package modes

import (
	"fmt"
	"github.com/Sahil-796/seeql/internal/generator"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
)

type QuickMode struct {
	parsedStmt any
	schema     *schema.Schema
	data       map[string][]map[string]any
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
	// TODO: Create tables, insert data, execute query
	_ = ctx
	return nil, fmt.Errorf("not implemented")
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
	return nil
}
