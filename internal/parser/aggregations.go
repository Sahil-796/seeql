package parser

import (
	"vitess.io/vitess/go/vt/sqlparser"
)

type AggregateType string

const (
	AggCount AggregateType = "COUNT"
	AggSum   AggregateType = "SUM"
	AggAvg   AggregateType = "AVG"
	AggMin   AggregateType = "MIN"
	AggMax   AggregateType = "MAX"
)

type AggregateExpr struct {
	Type   AggregateType
	Column string
	Alias  string
	IsStar bool
}

func ExtractAggregations(stmt sqlparser.Statement) []AggregateExpr {
	if v, ok := stmt.(*sqlparser.Select); ok {
		var aggregates []AggregateExpr

		// SelectExprs.Exprs means the expressions in the SELECT clause (Select name from ... <- name is an expr)
		// go doc package sqlparser.Select
		for _, selectExpr := range v.SelectExprs.Exprs {
			aliasedExpr, ok := selectExpr.(*sqlparser.AliasedExpr)
			if !ok {
				continue
			}

			if cnt, ok := aliasedExpr.Expr.(*sqlparser.Count); ok {

				agg := AggregateExpr{
					Type:  AggCount,
					Alias: aliasedExpr.As.String(),
				}

				switch len(cnt.Args) {
				case 0:
					agg.IsStar = true

				case 1:
					if col, ok := cnt.Args[0].(*sqlparser.ColName); ok {
						agg.Column = col.Name.String()
					}
				}

				aggregates = append(aggregates, agg)
			}

		}
		return aggregates
	}
	return nil
}
