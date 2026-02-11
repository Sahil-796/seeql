package modes

import (
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
	"vitess.io/vitess/go/vt/sqlparser"
)

type PlaygroundMode struct {
	session *db.Session
}

func NewPlaygroundMode(session *db.Session) *PlaygroundMode {
	return &PlaygroundMode{
		session: session,
	}
}

func (p *PlaygroundMode) Run(query string) (*QueryResult, error) {
	stmt, err := parser.Parse(query)
	if err != nil {
		return nil, err
	}

	switch stmt := stmt.(type) {
	case *sqlparser.CreateTable:
		return p.handleCreateTable(stmt)
	case *sqlparser.Select:
		return p.handleSelect(query)
	case *sqlparser.Insert:
		return p.handleInsert(query)
	case *sqlparser.Update:
		return p.handleUpdate(query)
	case *sqlparser.Delete:
		return p.handleDelete(query)
	default:
		return p.executeRaw(query)
	}
}

func (p *PlaygroundMode) handleCreateTable(stmt *sqlparser.CreateTable) (*QueryResult, error) {

	parsedDDL, err := parser.ExtractSchemaFromDDL(stmt)
	if err != nil {
		return nil, err
	}

	tableSchema := &schema.TableSchema{
		Name:    parsedDDL.TableName,
		Columns: make([]schema.ColumnSchema, len(parsedDDL.Columns)),
	}

	for i, col := range parsedDDL.Columns {
		tableSchema.Columns[i] = schema.ColumnSchema{
			Name:      col.Name,
			Type:      col.Type,
			Nullable:  col.Nullable,
			IsPrimary: col.IsPrimary,
			Constraints: schema.Constraints{
				MaxLength: col.MaxLength,
				Unique:    col.IsUnique,
			},
		}
	}

	// Create table in database
	err = db.CreateTable(p.session.DB, tableSchema)
	if err != nil {
		return nil, err
	}

	// make or append here
	if p.session.Schema == nil {
		p.session.Schema = &schema.Schema{
			Tables: []schema.TableSchema{*tableSchema},
		}
	} else {
		p.session.Schema.Tables = append(p.session.Schema.Tables, *tableSchema)
	}

	return &QueryResult{
		RowCount: 0,
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleSelect(query string) (*QueryResult, error) {
	result, err := db.ExecuteQuery(p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		Columns:  result.Columns,
		Rows:     result.Rows,
		RowCount: result.RowCount,
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleInsert(query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteInsert(p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleUpdate(query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteUpdate(p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleDelete(query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteDelete(p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) executeRaw(query string) (*QueryResult, error) {
	result, err := db.ExecuteRaw(p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		Columns:  result.Columns,
		Rows:     result.Rows,
		RowCount: result.RowCount,
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) GetSchema() (*schema.Schema, error) {
	return p.session.Schema, nil
}

func (p *PlaygroundMode) Close() error {
	return p.session.DB.Close()
}
