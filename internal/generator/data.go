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
}

func New(s *schema.Schema) *Generator {
	return &Generator{
		Schema: s,
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (g * Generator) GenerateData (rowsPerTable int) map[string][]map[string]interface{} {
	result := make(map[string][]map[string]interface{})
	
	for _, table := range g.Schema.Tables {
		rows := make([]map[string]interface{}, 0, rowsPerTable)
		fields := make(map[string]interface{})
		
		for _, column := range table.Columns {
			if column.IsPrimary {
				fields[column.Name] := gofakeit.UUID()
			}
		}

	}
	
}

