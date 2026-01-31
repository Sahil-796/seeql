package schema

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

type Relationship struct {
	TableA  string `json:"table_a"`
	ColumnA string `json:"column_a"`
	TableB  string `json:"table_b"`
	ColumnB string `json:"column_b"`
}

type Schema struct {
	Tables        []TableSchema  `json:"tables"`
	Relationships []Relationship `json:"relationships,omitempty"`
}
