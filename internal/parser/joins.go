package parser

import (
	"vitess.io/vitess/go/vt/sqlparser"
)

type Join struct {
	LeftTable   string
	LeftColumn  string
	RightTable  string
	RightColumn string
}

func ExtractJoins(stmt sqlparser.Statement, aliases map[string]string) []Join {

	joins := make([]Join, 0)
	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {

		if cmp, ok := node.(*sqlparser.ComparisonExpr); ok {

			if cmp.Operator != sqlparser.EqualOp {
				return true, nil
			}
			leftCol, ok1 := cmp.Left.(*sqlparser.ColName)
			rightCol, ok2 := cmp.Right.(*sqlparser.ColName)

			if !ok1 || !ok2 {
				return true, nil
			}

			leftQualifier := leftCol.Qualifier.Name.String()
			rightQualifier := rightCol.Qualifier.Name.String()

			leftTable, okL := aliases[leftQualifier]
			rightTable, okR := aliases[rightQualifier]

			if !okL {
				leftTable = leftQualifier
			}
			if !okR {
				rightTable = rightQualifier
			}

			if leftTable == rightTable {
				return true, nil
			}

			joins = append(joins, Join{
				LeftTable:   leftTable,
				LeftColumn:  leftCol.Name.String(),
				RightTable:  rightTable,
				RightColumn: rightCol.Name.String(),
			})
			return true, nil
		}

		return true, nil
	}, stmt)

	return joins
}
