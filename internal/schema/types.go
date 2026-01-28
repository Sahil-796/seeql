package schema

type ColumnSchema struct {
	Name      string
	IsPrimary bool
	IsForeign bool
	RefTable  string
	RefColumn string
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
	Tables []TableSchema `json:"tables"`
	Relationships []Relationship `json:"relationships"`
}