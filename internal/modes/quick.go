package modes

import (
	"fmt"
	"github.com/Sahil-796/seeql/internal/generator"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
)

type QuickMode struct {
	parsedStmt any
	schema *schema.Schema
	data map[string][]map[string]any
}

func NewQuickMode() *QuickMode {
	return &QuickMode{
		data: make(map[string][]map[string]any),
	}
}

func (q *QuickMode) ExecuteQuery(query string) (*QueryResult, error) {
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
	
	return q.buildResult(), nil
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

func (q *QuickMode) buildResult() *QueryResult {
	result := &QueryResult{
		Columns: []string{},
		Rows: []map[string]any{},
		RowCount: 0,
		Schema: q.schema,
	}
	
	if len(q.schema.Tables) == 0 || len(q.data) == 0 {
			return result
	}
	
	for tableName, rows := range q.data {
		if len(rows) == 0 {continue}
		
		for col := range rows[0] {
			result.Columns = append(result.Columns, fmt.Sprintf("%s.%s", tableName, col))
		}
		
		for i := 0; i < len(rows) && i < 5; i++ {
			result.Rows = append(result.Rows, rows[i])
		}

		result.RowCount = len(result.Rows)
		break
	}

	return result
	
}