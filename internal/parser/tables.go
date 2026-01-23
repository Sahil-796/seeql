package parser

import (
	"vitess.io/vitess/go/vt/sqlparser"
)

type TableSchema struct {
	Name    string
	Columns []string
}

func ExtractTables(stmt sqlparser.Statement) map[string]string {
	aliases := make(map[string]string)
	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {
		// Capture table aliases
		if aliasedTable, ok := node.(*sqlparser.AliasedTableExpr); ok {
			if tableName, ok := aliasedTable.Expr.(sqlparser.TableName); ok {
				realName := tableName.Name.String()
				alias := aliasedTable.As.String()

				if alias != "" {
					aliases[alias] = realName
				} else {
					aliases[realName] = realName
				}
			}
		}
		return true, nil
	}, stmt)

	return aliases
}
