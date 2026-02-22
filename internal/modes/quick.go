package modes

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/generator"
	"github.com/Sahil-796/seeql/internal/schema"
)

type QuickMode struct {
	schema        *schema.Schema
	sqlDB         *sql.DB
	initialized   bool
	createdTables map[string]bool
}

func NewQuickMode() *QuickMode {
	return &QuickMode{
		createdTables: make(map[string]bool),
	}
}

func (q *QuickMode) Run(ctx context.Context, query string) (*QueryResult, error) {
	newSchema, err := schema.BuildSchema(query)
	if err != nil {
		return nil, err
	}

	if len(newSchema.Tables) > db.MaxTablesPerSession {
		return nil, fmt.Errorf("query references %d tables, maximum allowed is %d", len(newSchema.Tables), db.MaxTablesPerSession)
	}

	if !q.initialized {
		sqlDB, err := sql.Open("sqlite3", ":memory:")
		if err != nil {
			return nil, fmt.Errorf("failed to create database: %w", err)
		}
		if err := db.ConfigureSQLite(sqlDB); err != nil {
			sqlDB.Close()
			return nil, fmt.Errorf("failed to configure database: %w", err)
		}
		q.sqlDB = sqlDB
		q.initialized = true
		q.schema = newSchema
	} else {
		q.schema = mergeSchemas(q.schema, newSchema)
		if len(q.schema.Tables) > db.MaxTablesPerSession {
			return nil, fmt.Errorf("total tables (%d) exceeds maximum allowed (%d)", len(q.schema.Tables), db.MaxTablesPerSession)
		}
	}

	gen := generator.New(q.schema)
	data := gen.GenerateData(5) // todo: make this dynamic

	for _, table := range q.schema.Tables {
		if !q.createdTables[table.Name] {
			if err := db.CreateTable(q.sqlDB, &table); err != nil {
				return nil, fmt.Errorf("failed to create table %s: %w", table.Name, err)
			}
			q.createdTables[table.Name] = true
		} else {
			// check if new columns are needed for old tables
			if err := q.addNewColumns(ctx, &table); err != nil {
				return nil, err
			}
		}
	}

	// data insertion
	for tableName, rows := range data {
		if err := db.InsertData(q.sqlDB, tableName, rows); err != nil {
			return nil, fmt.Errorf("failed to insert data into %s: %w", tableName, err)
		}
	}

	// query execution
	execResult, err := db.ExecuteQuery(ctx, q.sqlDB, query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	return &QueryResult{
		Columns:  execResult.Columns,
		Rows:     execResult.Rows,
		RowCount: execResult.RowCount,
		Schema:   q.schema,
	}, nil
}

func (q *QuickMode) addNewColumns(ctx context.Context, table *schema.TableSchema) error {
	existingCols, err := db.GetTableColumns(ctx, q.sqlDB, table.Name)
	if err != nil {
		return fmt.Errorf("failed to get columns for table %s: %w", table.Name, err)
	}

	existingColSet := make(map[string]bool)
	for _, col := range existingCols {
		existingColSet[col] = true
	}

	// Add any new columns
	for i := range table.Columns {
		if !existingColSet[table.Columns[i].Name] {
			if err := db.AddColumn(q.sqlDB, table.Name, &table.Columns[i]); err != nil {
				// Column might already exist or other error - continue
				continue
			}
		}
	}
	return nil
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

// mergeSchemas merges new schema into existing schema
func mergeSchemas(existing, newSchema *schema.Schema) *schema.Schema {
	if existing == nil {
		return newSchema
	}

	result := &schema.Schema{
		Tables:        make([]schema.TableSchema, len(existing.Tables)),
		Relationships: existing.Relationships,
	}
	copy(result.Tables, existing.Tables)

	for _, newTable := range newSchema.Tables {
		found := false
		for i, existingTable := range result.Tables {
			if existingTable.Name == newTable.Name {
				// Merge columns
				existingCols := make(map[string]bool)
				for _, col := range existingTable.Columns {
					existingCols[col.Name] = true
				}
				for _, newCol := range newTable.Columns {
					if !existingCols[newCol.Name] {
						result.Tables[i].Columns = append(result.Tables[i].Columns, newCol)
					}
				}
				found = true
				break
			}
		}
		if !found {
			result.Tables = append(result.Tables, newTable)
		}
	}

	// Merge relationships
	for _, newRel := range newSchema.Relationships {
		found := false
		for _, existingRel := range result.Relationships {
			if existingRel.LeftTable == newRel.LeftTable &&
				existingRel.RightTable == newRel.RightTable &&
				existingRel.LeftColumn == newRel.LeftColumn &&
				existingRel.RightColumn == newRel.RightColumn {
				found = true
				break
			}
		}
		if !found {
			result.Relationships = append(result.Relationships, newRel)
		}
	}

	return result
}
