package schema

type TableSchema struct {
	Name    string
	Columns []string
}

type ColumnSchema struct {
	Name      string
	IsPrimary bool
	IsForeign bool
	RefTable  string
	RefColumn string
}
