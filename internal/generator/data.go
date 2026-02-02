package generator

import (
	"github.com/brianvoe/gofakeit/v7"
	"math/rand"
	"time"

	"github.com/Sahil-796/seeql/internal/schema"
)

type Generator struct {
	Schema      *schema.Schema
	rng         *rand.Rand
	faker       *gofakeit.Faker
	primaryKeys map[string][]any                   
	uniqueVals  map[string]map[string]map[any]bool 
}

func New(s *schema.Schema) *Generator {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return &Generator{
		Schema:      s,
		rng:         rng,
		faker:       gofakeit.New(rng.Uint64()),
		primaryKeys: make(map[string][]any),
		uniqueVals:  make(map[string]map[string]map[any]bool),
	}
}

func (g *Generator) GenerateData(rowsPerTable int) map[string][]map[string]any {
	result := make(map[string][]map[string]any, len(g.Schema.Tables))

	for _, table := range g.Schema.Tables {
		g.generatePrimaryKeys(table, rowsPerTable)
	}

	for _, table := range g.Schema.Tables {
		rows := make([]map[string]any, rowsPerTable)

		for i := range rowsPerTable {
			row := make(map[string]any)

			for _, column := range table.Columns {
				
				row[column.Name] = g.GenerateColumnValue(table.Name, column, i, rowsPerTable)
			}

			rows[i] = row
		}

		result[table.Name] = rows
	}

	return result
}

func (g *Generator) generatePrimaryKeys(table schema.TableSchema, count int) {
	keys := make([]any, count)

	for _, column := range table.Columns {
		if column.IsPrimary {
			for i := range count {
				keys[i] = g.generatePrimaryKeyValue(column)
			}
			g.primaryKeys[table.Name] = keys
			return
		}
	}

	// If no primary key defined, use UUID as default
	for i := range count {
		keys[i] = g.faker.UUID()
	}
	g.primaryKeys[table.Name] = keys
}

func (g *Generator) generatePrimaryKeyValue(column schema.ColumnSchema) any {
	switch column.Type {
	case "INTEGER":
		return g.faker.IntRange(1, 1000000)
	case "UUID":
		return g.faker.UUID()
	default:
		return g.faker.UUID()
	}
}

func (g *Generator) GenerateColumnValue(tableName string, column schema.ColumnSchema, rowIndex int, totalRows int) any {
	faker := g.faker

	if column.Nullable && faker.Bool() {
		return nil
	}

	if column.IsPrimary {
		if keys, exists := g.primaryKeys[tableName]; exists && rowIndex < len(keys) {
			return keys[rowIndex]
		}
	}

	// Handle foreign keys - reference actual primary keys from other tables
	if column.IsForeign && column.RefTable != "" {
		if refKeys, exists := g.primaryKeys[column.RefTable]; exists {
			// Pick a random reference from the available keys
			if len(refKeys) > 0 {
				return refKeys[faker.IntRange(0, len(refKeys)-1)]
			}
		}
	}

	// Generate value based on type
	var value any
	switch column.Type {
	case "TEXT", "VARCHAR":
		if column.Constraints.MaxLength > 0 {
			value = faker.LetterN(uint(column.Constraints.MaxLength))
		} else {
			value = faker.Sentence(3)
		}
	case "INTEGER":
		if column.Constraints.Max > column.Constraints.Min {
			value = faker.IntRange(column.Constraints.Min, column.Constraints.Max)
		} else {
			value = faker.IntRange(1, 1000)
		}
	case "FLOAT", "REAL":
		value = faker.Float64Range(0.0, 1000.0)
	case "BOOLEAN":
		value = faker.Bool()
	case "DATE":
		value = faker.DateRange(time.Now().AddDate(-1, 0, 0), time.Now()).Format("2006-01-02")
	case "TIMESTAMP":
		value = faker.DateRange(time.Now().AddDate(-1, 0, 0), time.Now()).Format(time.RFC3339)
	case "UUID":
		value = faker.UUID()
	case "JSON":
		value = map[string]any{"key": faker.Word(), "value": faker.IntRange(1, 100)}
	case "EMAIL":
		value = faker.Email()
	case "URL":
		value = faker.URL()
	default:
		value = faker.Word()
	}

	// Handle UNIQUE constraint
	if column.Constraints.Unique {
		return g.ensureUnique(tableName, column.Name, value, func() any {
			return g.GenerateColumnValue(tableName, column, rowIndex, totalRows)
		})
	}

	return value
}

func (g *Generator) ensureUnique(tableName, columnName string, value any, regenerate func() any) any {
	if g.uniqueVals[tableName] == nil {
		g.uniqueVals[tableName] = make(map[string]map[any]bool)
	}
	if g.uniqueVals[tableName][columnName] == nil {
		g.uniqueVals[tableName][columnName] = make(map[any]bool)
	}

	// If value already exists, regenerate
	if g.uniqueVals[tableName][columnName][value] {
		return regenerate()
	}

	g.uniqueVals[tableName][columnName][value] = true
	return value
}