package schema

import "github.com/Sahil-796/seeql/internal/parser"

type ColumnSchema struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"`
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
	Name    string         `json:"name"`
	Columns []ColumnSchema `json:"columns"`
}

type Schema struct {
	Tables        []TableSchema `json:"tables"`
	Relationships []parser.Join `json:"relationships,omitempty"`
}
