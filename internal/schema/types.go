package schema

type ColumnSchema struct {
	Name      string
	IsPrimary bool
	IsForeign bool
	RefTable  string
	RefColumn string
}
