package modes

import (
	"context"
	"fmt"
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/go-playground/validator/v10"
	"vitess.io/vitess/go/vt/sqlparser"
)

type PlaygroundMode struct {
	session        *db.Session
	sessionManager *db.SessionManager
}

func NewPlaygroundMode(session *db.Session, sessionManager *db.SessionManager) *PlaygroundMode {
	return &PlaygroundMode{
		session:        session,
		sessionManager: sessionManager,
	}
}

func (p *PlaygroundMode) Run(ctx context.Context, query string) (*QueryResult, error) {
	stmt, err := parser.Parse(query)
	if err != nil {
		return nil, err
	}

	switch stmt := stmt.(type) {
	case *sqlparser.CreateTable:
		return p.handleCreateTable(ctx, stmt)
	case *sqlparser.Select:
		return p.handleSelect(ctx, query)
	case *sqlparser.Insert:
		return p.handleInsert(ctx, query)
	case *sqlparser.Update:
		return p.handleUpdate(ctx, query)
	case *sqlparser.Delete:
		return p.handleDelete(ctx, query)
	default:
		return p.executeRaw(ctx, query)
	}
}

func (p *PlaygroundMode) handleCreateTable(ctx context.Context, stmt *sqlparser.CreateTable) (*QueryResult, error) {
	if len(p.session.Schema.Tables) >= db.MaxTablesPerSession {
		return nil, fmt.Errorf("maximum table limit reached (%d tables)", db.MaxTablesPerSession)
	}

	parsedDDL, err := parser.ExtractSchemaFromDDL(stmt)
	if err != nil {
		return nil, err
	}

	// Build columns first, then validate
	columns := make([]schema.ColumnSchema, len(parsedDDL.Columns))
	for i, col := range parsedDDL.Columns {
		columns[i] = schema.ColumnSchema{
			Name:      col.Name,
			Type:      col.Type,
			Nullable:  col.Nullable,
			IsPrimary: col.IsPrimary,
			IsForeign: col.IsForeign,
			RefTable:  col.RefTable,
			RefColumn: col.RefColumn,
			Constraints: schema.Constraints{
				MaxLength: col.MaxLength,
				Unique:    col.IsUnique,
			},
		}
	}

	tableSchema := &schema.TableSchema{
		Name:    parsedDDL.TableName,
		Columns: columns,
	}

	// Validate after columns are populated
	if err := schema.Validate.Struct(tableSchema); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		return nil, fmt.Errorf("invalid table schema: %s", validationErrors[0].Error())
	}

	// Create table in database
	err = db.CreateTable(p.session.DB, tableSchema)
	if err != nil {
		return nil, err
	}

	// Schema is guaranteed initialized by NewSession constructor
	p.session.Mu.Lock()
	p.session.Schema.Tables = append(p.session.Schema.Tables, *tableSchema)
	p.session.Mu.Unlock()

	// persist schema changes to session
	if err := p.sessionManager.UpdateSession(p.session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	return &QueryResult{
		RowCount: 0,
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleSelect(ctx context.Context, query string) (*QueryResult, error) {
	result, err := db.ExecuteQuery(ctx, p.session.DB, query)
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

func (p *PlaygroundMode) handleInsert(ctx context.Context, query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteInsert(ctx, p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleUpdate(ctx context.Context, query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteUpdate(ctx, p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleDelete(ctx context.Context, query string) (*QueryResult, error) {
	rowsAffected, err := db.ExecuteDelete(ctx, p.session.DB, query)
	if err != nil {
		return nil, err
	}

	return &QueryResult{
		RowCount: int(rowsAffected),
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) executeRaw(ctx context.Context, query string) (*QueryResult, error) {
	result, err := db.ExecuteRaw(ctx, p.session.DB, query)
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
