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

	// Process each column definition
	for _, colDef := range createTable.TableSpec.Columns {
		col := extractColumn(colDef)
		parsed.Columns = append(parsed.Columns, col)
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
