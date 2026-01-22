package types

type Join struct {
	LeftTable   string
	LeftColumn  string
	RightTable  string
	RightColumn string
}

type TableSchema struct {
	Name    string
	Columns []string
}
