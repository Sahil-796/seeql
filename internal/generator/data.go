package generator

import (
	"time"
	"math/rand"

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

func (g * Generator) GenerateData (rowsPerTable int) map[string][]map[string] interface {} {
	
}

