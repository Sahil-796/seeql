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

type Schema struct {
	Tables []TableSchema `json:"tables"`
}