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
		// check for arguments (columns or such)
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

			if sum, ok := aliasedExpr.Expr.(*sqlparser.Sum); ok {
				agg := AggregateExpr{
					Type:  AggSum,
					Alias: aliasedExpr.As.String(),
				}
				if col, ok := sum.Arg.(*sqlparser.ColName); ok {
					agg.Column = col.Name.String()
				}
				aggregates = append(aggregates, agg)
			}

			if avg, ok := aliasedExpr.Expr.(*sqlparser.Avg); ok {
				agg := AggregateExpr{
					Type:  AggAvg,
					Alias: aliasedExpr.As.String(),
				}
				if col, ok := avg.Arg.(*sqlparser.ColName); ok {
					agg.Column = col.Name.String()
				}
				aggregates = append(aggregates, agg)
			}

			if min, ok := aliasedExpr.Expr.(*sqlparser.Min); ok {
				agg := AggregateExpr{
					Type:  AggMin,
					Alias: aliasedExpr.As.String(),
				}
				if col, ok := min.Arg.(*sqlparser.ColName); ok {
					agg.Column = col.Name.String()
				}
				aggregates = append(aggregates, agg)
			}

			if max, ok := aliasedExpr.Expr.(*sqlparser.Max); ok {
				agg := AggregateExpr{
					Type:  AggMax,
					Alias: aliasedExpr.As.String(),
				}
				if col, ok := max.Arg.(*sqlparser.ColName); ok {
					agg.Column = col.Name.String()
				}
				aggregates = append(aggregates, agg)
			}

		}
		return aggregates
	}
	return nil
}

// if the statement contains any aggregate functions
func HasAggregations(stmt sqlparser.Statement) bool {
	return len(ExtractAggregations(stmt)) > 0
}


//returns the expected data type for an aggregation
func GetAggregationReturnType(aggType AggregateType) string {
	switch aggType {
	case AggCount:
		return "INTEGER"
	case AggSum, AggAvg:
		return "FLOAT"
	case AggMin, AggMax:
		return "TEXT"
	default:
		return "TEXT"
	}
}
