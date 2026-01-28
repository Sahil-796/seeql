package schema

import (

	"github.com/Sahil-796/seeql/internal/parser"
	"vitess.io/vitess/go/vt/sqlparser"
)

func BuildSchema(stmt sqlparser.Statement) *Schema {
	aliases := parser.ExtractTables(stmt)
	tableToColumns := parser.ExtractColumns(stmt, aliases)
	joins := parser.ExtractJoins(stmt, aliases)
	
	type fkRef struct {
		refTable  string
		refColumn string
	}
	
	fkLookup := make(map[string]fkRef)
	
	for _, j := range joins {
		leftKey := j.LeftTable + "." + j.LeftColumn
		fkLookup[leftKey] = fkRef{
			refTable:  j.RightTable,
			refColumn: j.RightColumn,
		}
	}
	
	schema := &Schema{
		Tables: make([]TableSchema, 0, len(tableToColumns)),
	}
	
	for tableName, columns := range tableToColumns {
		tableSchema:= TableSchema {
			Name: tableName,
			Columns: make([]ColumnSchema, 0, len(columns)),
		}
		
		for _, colName := range columns {
			col := ColumnSchema {
				Name: colName,
			}
			
			key := tableName + "." + colName
			if ref, ok := fkLookup[key]; ok {
				col.IsForeign = true
				col.RefTable = ref.refTable
				col.RefColumn = ref.refColumn
			}
			
			for _, j := range joins {
				if j.RightTable == tableName && j.RightColumn == colName {
					col.IsPrimary = true
					break
				}
			}
			
			tableSchema.Columns = append(tableSchema.Columns, col)
		}
		schema.Tables = append(schema.Tables, tableSchema)
	}
	
	return schema
}
