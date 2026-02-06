package parser

import (
	"vitess.io/vitess/go/vt/sqlparser"
)

// ExtractColumns returns table -> columns used in query
func ExtractColumns(stmt sqlparser.Statement, aliases map[string]string) map[string][]string {
	// Use map[string]struct{} to deduplicate columns per table
	result := make(map[string]map[string]struct{})

	// Track unqualified columns (no table alias) to assign later
	var unqualifiedCols []string

	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {

		// column references
		if col, ok := node.(*sqlparser.ColName); ok {
			qualifier := col.Qualifier.Name.String() // the u in  u.name (the alias)
			// qualifier is needed to map with aliases[]
			colName := col.Name.String() // the name in u.name (the actual column name)

			if realTable, exists := aliases[qualifier]; exists {
				qualifier = realTable
			}

			// If no qualifier, track as unqualified
			if qualifier == "" {
				unqualifiedCols = append(unqualifiedCols, colName)
			} else {
				if result[qualifier] == nil {
					result[qualifier] = make(map[string]struct{})
				}
				result[qualifier][colName] = struct{}{}
			}
		}
		return true, nil
	}, stmt)

	// Assign unqualified columns to the single table if there's only one
	if len(unqualifiedCols) > 0 && len(aliases) == 1 {
		// Get the only table name from aliases
		var singleTable string
		for _, realName := range aliases {
			singleTable = realName
			break
		}
		if result[singleTable] == nil {
			result[singleTable] = make(map[string]struct{})
		}
		for _, colName := range unqualifiedCols {
			result[singleTable][colName] = struct{}{}
		}
	}

	// Convert to map[string][]string
	finalResult := make(map[string][]string)
	for table, cols := range result {
		colList := make([]string, 0, len(cols))
		for col := range cols {
			colList = append(colList, col)
		}
		finalResult[table] = colList
	}

	return finalResult
}
