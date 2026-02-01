package generator

import (
	"time"
	"math/rand"
	"github.com/brianvoe/gofakeit/v7"

	"github.com/Sahil-796/seeql/internal/schema"
)

type Generator struct {
	Schema *schema.Schema
	rng *rand.Rand
	faker *gofakeit.Faker
}

func New(s *schema.Schema) *Generator {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return &Generator{
		Schema: s,
		rng: rng,
		faker: gofakeit.New(rng.Uint64()),
	}
}

func (g * Generator) GenerateData (rowsPerTable int) map[string][]map[string]any {
	result := make(map[string][]map[string]any)
	
	
	for _, table := range g.Schema.Tables {
		rows := make([]map[string]any, rowsPerTable)
		foreignRefs := g.GenerateForeignKeys(table)
		
		for i := range rowsPerTable {
			row := make(map[string]any)
	
			
			for _, column := range table.Columns {
				
				row[column.Name] = g.GenerateColumnValue(column, foreignRefs, i)
			}
			
			rows[i] = row
		}
		
		result[table.Name] = rows
	}
	
	return result
}

func (g *Generator) GenerateColumnValue(column schema.ColumnSchema, foreignRefs map[string][]any, rowIndex int) any{
	
	faker := g.faker
	
	switch column.Type {
		case "TEXT", "VARCHAR":
			if column.Constraints.MaxLength > 0 {
				return faker.LetterN(uint(column.Constraints.MaxLength))
			}
			return faker.Sentence(3)
		case "INTEGER":
			if column.Constraints.Min > 0 && column.Constraints.Max > 0 {
				return faker.IntRange(column.Constraints.Min, column.Constraints.Max)
			}
			return faker.IntRange(1, 1000)
		case "FLOAT", "REAL":
			return faker.Float64Range(0.0, 1000.0)
		case "BOOLEAN":
			return faker.Bool()
		case "DATE":
			return faker.DateRange(time.Now().AddDate(-1, 0, 0), time.Now()).Format("2006-01-02")
		case "TIMESTAMP":
			return faker.DateRange(time.Now().AddDate(-1, 0, 0), time.Now()).Format(time.RFC3339)
		case "UUID":
			return faker.UUID()
		case "JSON":
			return map[string]any{"key": faker.Word(), "value": faker.IntRange(1, 100)}
		case "EMAIL":
			return faker.Email()
		case "URL":
			return faker.URL()
		default:
			return faker.Word()
			
	}
}

func (g *Generator) GenerateForeignKeys(table schema.TableSchema) map[string][]interface{} {
	refs := make(map[string][]any)
	
	for _, column := range table.Columns {
		if column.IsForeign && column.RefTable != "" {
			// Generate reference values from the referenced table
			if _, exists := g.findTable(column.RefTable); exists {
				refValues := make([]any, 10) // Generate 10 reference values
				for i := range 10 {
					refValues[i] = gofakeit.UUID() // Assuming UUID for foreign keys
				}
				refs[column.Name] = refValues
			}
		}
	}
	
	return refs
}

func (g *Generator) findTable(tableName string) (schema.TableSchema, bool) {
	for _, table := range g.Schema.Tables {
		if table.Name == tableName {
			return table, true
		}
	}
	return schema.TableSchema{}, false
}