package parser

import (
	"vitess.io/vitess/go/vt/sqlparser"
)

func ExtractJoins(stmt sqlparser.Statement) {
	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {

		if cmp, ok := node.(*sqlparser.ComparisonExpr); ok {
			if cmp.Operator.ToString() != "=" { 
				// this bizzare piece of shit uses doesnt have a clean naming convention. wtf is Parse2`
				return true, nil
			}
			leftCol, ok1 := cmp.Left.(*sqlparser.ColName)
			rightCol, ok2 := cmp.Right.(*sqlparser.ColName)

		}

		return true, nil
	}, stmt)
}
