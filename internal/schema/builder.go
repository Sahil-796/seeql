package schema

import (
	"fmt"

	"github.com/Sahil-796/seeql/internal/parser"
	"vitess.io/vitess/go/vt/sqlparser"
)

func BuildSchema(stmt sqlparser.Statement) {

	tableToColumns := parser.ExtractColumns(stmt)
	fmt.Print(tableToColumns)
}
