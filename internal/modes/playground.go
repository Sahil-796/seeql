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
	case *sqlparser.AlterTable:
		return p.handleAlterTable(ctx, stmt)
	case *sqlparser.DropTable:
		return p.handleDropTable(ctx, stmt)

	// case *sqlparser.CreateIndex:
	// 	return p.handleCreateIndex(ctx, stmt)
	// case *sqlparser.DropIndex:
	// 	return p.handleDropIndex(ctx, stmt)
	// case *sqlparser.RenameIndex:
	// 	return p.handleRenameIndex(ctx, stmt)

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

func (p *PlaygroundMode) handleAlterTable(ctx context.Context, stmt *sqlparser.AlterTable) (*QueryResult, error) {
	tableName := stmt.Table.Name.String()

	query := sqlparser.String(stmt)
	if err := db.AlterTable(ctx, p.session.DB, query); err != nil {
		return nil, err
	}

	p.session.Mu.Lock()
	for _, opt := range stmt.AlterOptions {
		switch alt := opt.(type) {
		case *sqlparser.AddColumns:
			for _, col := range alt.Columns {
				colType := "TEXT"
				if col.Type != nil {
					colType = col.Type.Type
				}
				newCol := schema.ColumnSchema{
					Name:     col.Name.String(),
					Type:     colType,
					Nullable: true,
				}
				p.addColumnToTable(tableName, newCol)
			}
		case *sqlparser.DropColumn:
			p.removeColumnFromTable(tableName, alt.Name.Name.String())
		case *sqlparser.RenameTableName:
			p.renameTable(tableName, alt.Table.Name.String())
		}
	}
	p.session.Mu.Unlock()

	return &QueryResult{
		RowCount: 0,
		Schema:   p.session.Schema,
	}, nil
}

func (p *PlaygroundMode) handleDropTable(ctx context.Context, stmt *sqlparser.DropTable) (*QueryResult, error) {
	query := sqlparser.String(stmt)
	if err := db.DropTableExec(ctx, p.session.DB, query); err != nil {
		return nil, err
	}

	// Remove tables from in-memory schema
	p.session.Mu.Lock()
	for _, tbl := range stmt.FromTables {
		name := tbl.Name.String()
		for i, t := range p.session.Schema.Tables {
			if t.Name == name {
				p.session.Schema.Tables = append(p.session.Schema.Tables[:i], p.session.Schema.Tables[i+1:]...)
				break
			}
		}
	}
	p.session.Mu.Unlock()

	return &QueryResult{
		RowCount: 0,
		Schema:   p.session.Schema,
	}, nil
}

// schema helper methods — called with session.Mu held

func (p *PlaygroundMode) addColumnToTable(tableName string, col schema.ColumnSchema) {
	for i, t := range p.session.Schema.Tables {
		if t.Name == tableName {
			p.session.Schema.Tables[i].Columns = append(p.session.Schema.Tables[i].Columns, col)
			return
		}
	}
}

func (p *PlaygroundMode) removeColumnFromTable(tableName, colName string) {
	for i, t := range p.session.Schema.Tables {
		if t.Name == tableName {
			for j, c := range t.Columns {
				if c.Name == colName {
					p.session.Schema.Tables[i].Columns = append(t.Columns[:j], t.Columns[j+1:]...)
					return
				}
			}
		}
	}
}

func (p *PlaygroundMode) renameTable(oldName, newName string) {
	for i, t := range p.session.Schema.Tables {
		if t.Name == oldName {
			p.session.Schema.Tables[i].Name = newName
			return
		}
	}
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
