package schema

import (
	"github.com/Sahil-796/seeql/internal/parser"
	"strings"
	"vitess.io/vitess/go/vt/sqlparser"
)

func BuildSchema(stmt sqlparser.Statement) (*Schema, error) {
	aliases := parser.ExtractTables(stmt)
	tableToColumns := parser.ExtractColumns(stmt, aliases)
	joins := parser.ExtractJoins(stmt, aliases)

	// quick lookup sets 
	tablenames := make(map[string]struct{}, len(tableToColumns)) 
	for tableName := range tableToColumns {
		tablenames[tableName] = struct{}{}
	}

	schema := &Schema{
		Tables:        make([]TableSchema, 0, len(tableToColumns)),
		Relationships: joins,
	}

	for tableName, columns := range tableToColumns {
		tableSchema := TableSchema{
			Name:    tableName,
			Columns: make([]ColumnSchema, 0, len(columns)),
		}
		
		// this filters columns and sets, pks & fks
		for _, colName := range columns {
			col := ColumnSchema{
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

	return schema, nil
}

func inferReferencedTable(prefix string, tableNames map[string]struct{}) string {
	// Try exact match
	if _, ok := tableNames[prefix]; ok {
		return prefix
	}
	// Try plural form
	if _, ok := tableNames[prefix+"s"]; ok {
		return prefix + "s"
	}
	// Try with "es" suffix (e.g., "box" -> "boxes")
	if _, ok := tableNames[prefix+"es"]; ok {
		return prefix + "es"
	}
	return ""
}
