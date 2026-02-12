package schema

import (
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/go-playground/validator/v10"
)

var Validate = validator.New()

type ColumnSchema struct {
	Name        string      `json:"name" validate:"required,min=1,max=64"`
	Type        string      `json:"type" validate:"required,oneof=TEXT INTEGER FLOAT BOOLEAN DATE TIMESTAMP UUID EMAIL URL JSON"`
	Nullable    bool        `json:"nullable"`
	IsPrimary   bool        `json:"is_primary,omitempty"`
	IsForeign   bool        `json:"is_foreign,omitempty"`
	RefTable    string      `json:"ref_table,omitempty"`
	RefColumn   string      `json:"ref_column,omitempty"`
	Constraints Constraints `json:"constraints"`
}

type Constraints struct {
	MaxLength int  `json:"max_length,omitempty"`
	Min       int  `json:"min,omitempty"`
	Max       int  `json:"max,omitempty"`
	Unique    bool `json:"unique,omitempty"`
}

type TableSchema struct {
	Name    string         `json:"name" validate:"required,min=1,max=64"`
	Columns []ColumnSchema `json:"columns" validate:"required,min=1,dive"`
}

type Schema struct {
	Tables        []TableSchema `json:"tables"`
	Relationships []parser.Join `json:"relationships,omitempty"`
}
