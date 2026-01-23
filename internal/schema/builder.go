package schema

import (
	"fmt"

	"github.com/Sahil-796/seeql/internal/parser"
	"vitess.io/vitess/go/vt/sqlparser"
)

func BuildSchema(stmt sqlparser.Statement) {
	aliases := parser.ExtractTables(stmt)
	tableToColumns := parser.ExtractColumns(stmt, aliases)
	joins := parser.ExtractJoins(stmt, aliases)
	fmt.Println("COLUMNS:")
	fmt.Printf("%+v\n", tableToColumns)

	fmt.Println("JOINS:")
	fmt.Printf("%+v\n", joins)
}
