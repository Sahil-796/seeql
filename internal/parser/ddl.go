package parser

import (
	"fmt"
	"strconv"
	"strings"

	"vitess.io/vitess/go/vt/sqlparser"
)

// ParsedDDL represents a parsed CREATE TABLE statement with extracted info
type ParsedDDL struct {
	TableName string
	Columns   []ParsedColumn
}

// ParsedColumn represents a column from CREATE TABLE
type ParsedColumn struct {
	Name      string
	Type      string
	Nullable  bool
	IsPrimary bool
	IsUnique  bool
	MaxLength int
	IsForeign bool
	RefTable  string
	RefColumn string
}

// ParseCreateTable parses a CREATE TABLE statement
func ParseCreateTable(sql string) (*sqlparser.CreateTable, error) {
	stmt, err := Parse(sql)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SQL: %w", err)
	}

	createTable, ok := stmt.(*sqlparser.CreateTable)
	if !ok {
		return nil, fmt.Errorf("not a CREATE TABLE statement")
	}

	return createTable, nil
}

// ExtractSchemaFromDDL extracts schema info from a CREATE TABLE statement
func ExtractSchemaFromDDL(createTable *sqlparser.CreateTable) (*ParsedDDL, error) {
	if createTable.TableSpec == nil {
		return nil, fmt.Errorf("CREATE TABLE has no table specification")
	}

	parsed := &ParsedDDL{
		TableName: createTable.Table.Name.String(),
		Columns:   make([]ParsedColumn, 0),
	}

	// Build a map of column name -> index for later FK updates
	colIndexMap := make(map[string]int)

	// Process each column definition
	for _, colDef := range createTable.TableSpec.Columns {
		col := extractColumn(colDef)
		colIndexMap[strings.ToLower(col.Name)] = len(parsed.Columns)
		parsed.Columns = append(parsed.Columns, col)
	}

	// Process table-level constraints (including FOREIGN KEY)
	for _, constraint := range createTable.TableSpec.Constraints {
		// Check if this is a ForeignKeyDefinition
		if fk, ok := constraint.Details.(*sqlparser.ForeignKeyDefinition); ok {
			// fk.Source contains the local columns
			// fk.ReferenceDefinition contains the referenced table/columns
			if len(fk.Source) > 0 && fk.ReferenceDefinition != nil {
				localColName := fk.Source[0].String()
				refTable := fk.ReferenceDefinition.ReferencedTable.Name.String()
				refColumn := ""
				if len(fk.ReferenceDefinition.ReferencedColumns) > 0 {
					refColumn = fk.ReferenceDefinition.ReferencedColumns[0].String()
				}

				// Update the column with FK info
				if colIdx, ok := colIndexMap[strings.ToLower(localColName)]; ok {
					parsed.Columns[colIdx].IsForeign = true
					parsed.Columns[colIdx].RefTable = refTable
					parsed.Columns[colIdx].RefColumn = refColumn
				}
			}
		}
	}

	return parsed, nil
}

// extractColumn extracts column info from ColumnDefinition
func extractColumn(colDef *sqlparser.ColumnDefinition) ParsedColumn {
	col := ParsedColumn{
		Name:     colDef.Name.String(),
		Type:     mapSQLTypeToInternal(colDef.Type.Type),
		Nullable: true, // Default to nullable
	}

	// Check options
	if colDef.Type.Options != nil {
		// Check NULL/NOT NULL
		if colDef.Type.Options.Null != nil {
			col.Nullable = *colDef.Type.Options.Null
		}

		// Check primary key
		if colDef.Type.Options.KeyOpt == sqlparser.ColKeyPrimary {
			col.IsPrimary = true
		}

		// Check unique
		if colDef.Type.Options.KeyOpt == sqlparser.ColKeyUnique ||
			colDef.Type.Options.KeyOpt == sqlparser.ColKeyUniqueKey {
			col.IsUnique = true
		}

		// Check inline REFERENCES (e.g., user_id INTEGER REFERENCES users(id))
		if colDef.Type.Options.Reference != nil {
			ref := colDef.Type.Options.Reference
			col.IsForeign = true
			col.RefTable = ref.ReferencedTable.Name.String()
			if len(ref.ReferencedColumns) > 0 {
				col.RefColumn = ref.ReferencedColumns[0].String()
			}
		}
	}

	// Extract length if present (for VARCHAR(255), etc.)
	if colDef.Type.Length != nil {
		col.MaxLength = *colDef.Type.Length
	}

	return col
}

// mapSQLTypeToInternal maps SQL types to our internal types
func mapSQLTypeToInternal(sqlType string) string {
	sqlType = strings.ToUpper(sqlType)

	switch sqlType {
	case "INT", "INTEGER", "BIGINT", "SMALLINT", "TINYINT", "SERIAL":
		return "INTEGER"
	case "FLOAT", "REAL", "DOUBLE", "DECIMAL", "NUMERIC":
		return "FLOAT"
	case "BOOLEAN", "BOOL":
		return "BOOLEAN"
	case "DATE":
		return "DATE"
	case "DATETIME", "TIMESTAMP", "TIME":
		return "TIMESTAMP"
	case "JSON":
		return "JSON"
	case "UUID":
		return "UUID"
	default:
		// VARCHAR, TEXT, CHAR, etc. all map to TEXT
		return "TEXT"
	}
}

// IsCreateTable checks if a SQL statement is a CREATE TABLE
func IsCreateTable(sql string) bool {
	upper := strings.ToUpper(strings.TrimSpace(sql))
	return strings.HasPrefix(upper, "CREATE TABLE")
}

// Helper to parse int from string
func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}
