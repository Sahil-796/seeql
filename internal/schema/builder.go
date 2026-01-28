package schema

import (
	"strings"
	"github.com/Sahil-796/seeql/internal/parser"
	"vitess.io/vitess/go/vt/sqlparser"
)

func BuildSchema(stmt sqlparser.Statement) *Schema {
	aliases := parser.ExtractTables(stmt)
	tableToColumns := parser.ExtractColumns(stmt, aliases)
	joins := parser.ExtractJoins(stmt, aliases)
	
	tablenames := make(map[string]bool)
	
	for _, realname := range aliases {
		tablenames[realname] = true
	}
	
	relationships := make([]Relationship, 0, len(joins))
	
	for _, j := range joins {
		relationships = append(relationships, Relationship{
			TableA:  j.LeftTable,
			ColumnA: j.LeftColumn,
			TableB:  j.RightTable,
			ColumnB: j.RightColumn,
		})
	}
	
	schema := &Schema{
		Tables: make([]TableSchema, 0, len(tableToColumns)),
		Relationships: relationships,
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
			
			if strings.ToLower(colName) == "id" {
				col.IsPrimary = true
			}
			
			if strings.HasSuffix(strings.ToLower(colName), "_id") && colName != "id" {
				
				prefix := strings.TrimSuffix(strings.ToLower(colName), "_id")
				
				refTable := inferReferencedTable(prefix, tablenames)
				
				if refTable != "" {
					col.IsForeign = true
					col.RefTable = refTable
					col.RefColumn = "id"
				} else {
					col.IsForeign = true
				}
			}
			
			tableSchema.Columns = append(tableSchema.Columns, col)
		}
		schema.Tables = append(schema.Tables, tableSchema)
	}
	
	return schema
}


func inferReferencedTable(prefix string, tableNames map[string]bool) string {
	// Try exact match
	if tableNames[prefix] {
		return prefix
	}
	// Try plural form
	if tableNames[prefix+"s"] {
		return prefix + "s"
	}
	// Try with "es" suffix (e.g., "box" -> "boxes")
	if tableNames[prefix+"es"] {
		return prefix + "es"
	}
	return ""
}