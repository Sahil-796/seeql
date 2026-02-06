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

	tablenames := make(map[string]struct{}, len(tableToColumns))
	for tableName := range tableToColumns {
		tablenames[tableName] = struct{}{}
	}

	// STEP 1: Pre-compute PK map
	// pkMap stores: tableName -> pkColumnName
	// This allows O(1) lookup when resolving FKs
	pkMap := make(map[string]string)
	for tableName, columns := range tableToColumns {
		foundPK := false
		for _, colName := range columns {
			if isPrimaryKeyColumn(colName) {
				pkMap[tableName] = colName
				foundPK = true
				break
			}
		}
		// Default to "id" if no explicit PK found
		if !foundPK {
			pkMap[tableName] = "id"
		}
	}

	schema := &Schema{
		Tables:        make([]TableSchema, 0, len(tableToColumns)),
		Relationships: joins,
	}

	// STEP 2: Build schema with immediate FK resolution
	for tableName, columns := range tableToColumns {
		tableSchema := TableSchema{
			Name:    tableName,
			Columns: make([]ColumnSchema, 0, len(columns)),
		}

		for _, colName := range columns {
			col := ColumnSchema{
				Name: colName,
				Type: inferColumnType(colName),
			}

			// Detect Primary Key
			if isPrimaryKeyColumn(colName) {
				col.IsPrimary = true
			}

			// Detect Foreign Key and IMMEDIATELY resolve it
			if strings.HasSuffix(strings.ToLower(colName), "_id") && colName != "id" {
				prefix := strings.TrimSuffix(strings.ToLower(colName), "_id")
				refTable := inferReferencedTable(prefix, tablenames)

				if refTable != "" {
					col.IsForeign = true
					col.RefTable = refTable

					// Use pkMap for O(1) lookup of referenced PK
					refPkCol := pkMap[refTable]
					col.RefColumn = refPkCol

					// Match FK type to PK type
					// If PK is "id" -> INTEGER, otherwise infer from PK column name
					if refPkCol == "id" {
						col.Type = "INTEGER"
					} else {
						col.Type = inferColumnType(refPkCol)
					}
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

// a big vibe coded aggressive column type selector
func inferColumnType(colName string) string {
	lower := strings.ToLower(colName)

	// Primary key and foreign keys
	if lower == "id" || strings.HasSuffix(lower, "_id") {
		return "INTEGER"
	}

	// Email
	if strings.Contains(lower, "email") {
		return "EMAIL"
	}

	// URLs
	if strings.Contains(lower, "url") || strings.Contains(lower, "website") || strings.Contains(lower, "link") {
		return "URL"
	}

	// Phone
	if strings.Contains(lower, "phone") || strings.Contains(lower, "mobile") || strings.Contains(lower, "tel") {
		return "TEXT"
	}

	// Timestamps and dates
	if strings.Contains(lower, "created_at") || strings.Contains(lower, "updated_at") ||
		strings.Contains(lower, "deleted_at") || strings.Contains(lower, "timestamp") {
		return "TIMESTAMP"
	}
	if strings.Contains(lower, "date") || strings.Contains(lower, "birthday") || strings.Contains(lower, "dob") {
		return "DATE"
	}

	// Boolean fields
	if strings.HasPrefix(lower, "is_") || strings.HasPrefix(lower, "has_") ||
		strings.HasPrefix(lower, "can_") || strings.HasPrefix(lower, "should_") ||
		strings.HasPrefix(lower, "will_") || strings.HasPrefix(lower, "was_") ||
		lower == "active" || lower == "enabled" || lower == "visible" ||
		lower == "deleted" || lower == "verified" || lower == "confirmed" ||
		lower == "published" || lower == "archived" || lower == "completed" ||
		lower == "approved" || lower == "blocked" || lower == "subscribed" ||
		lower == "premium" || lower == "featured" {
		return "BOOLEAN"
	}

	// Numeric / Money / Prices
	if strings.Contains(lower, "price") || strings.Contains(lower, "amount") ||
		strings.Contains(lower, "cost") || strings.Contains(lower, "fee") ||
		strings.Contains(lower, "salary") || strings.Contains(lower, "budget") ||
		strings.Contains(lower, "discount") || strings.Contains(lower, "tax") ||
		strings.Contains(lower, "rate") || strings.Contains(lower, "percentage") ||
		strings.Contains(lower, "percent") || strings.HasSuffix(lower, "_rate") ||
		strings.HasSuffix(lower, "_pct") || strings.HasSuffix(lower, "_percent") {
		return "FLOAT"
	}

	// Integer counts and quantities
	if strings.Contains(lower, "count") || strings.Contains(lower, "quantity") ||
		strings.Contains(lower, "qty") || strings.Contains(lower, "number") ||
		strings.Contains(lower, "num_") || strings.Contains(lower, "_num") ||
		strings.Contains(lower, "age") || strings.Contains(lower, "year") ||
		strings.Contains(lower, "month") || strings.Contains(lower, "day") ||
		strings.Contains(lower, "week") || strings.Contains(lower, "hour") ||
		strings.Contains(lower, "minute") || strings.Contains(lower, "min") ||
		strings.Contains(lower, "second") || strings.Contains(lower, "sec") ||
		strings.Contains(lower, "level") || strings.Contains(lower, "priority") ||
		strings.Contains(lower, "score") || strings.Contains(lower, "rating") ||
		strings.Contains(lower, "position") || strings.Contains(lower, "rank") ||
		strings.Contains(lower, "version") || strings.HasSuffix(lower, "_count") ||
		strings.HasSuffix(lower, "_qty") || strings.HasSuffix(lower, "_level") {
		return "INTEGER"
	}

	// JSON data
	if strings.Contains(lower, "json") || strings.Contains(lower, "meta") ||
		strings.Contains(lower, "config") || strings.Contains(lower, "settings") ||
		strings.Contains(lower, "options") || strings.Contains(lower, "params") ||
		strings.Contains(lower, "data") || strings.Contains(lower, "payload") ||
		strings.Contains(lower, "attributes") || strings.Contains(lower, "properties") {
		return "JSON"
	}

	// UUIDs
	if strings.Contains(lower, "uuid") || strings.Contains(lower, "guid") ||
		strings.Contains(lower, "token") || strings.Contains(lower, "key") ||
		strings.Contains(lower, "slug") || strings.Contains(lower, "reference") ||
		strings.Contains(lower, "ref_") || strings.HasSuffix(lower, "_ref") {
		return "UUID"
	}

	// Names and descriptions
	if lower == "name" || lower == "title" || lower == "label" ||
		lower == "subject" || lower == "headline" || lower == "caption" ||
		lower == "code" || lower == "sku" || lower == "isbn" ||
		lower == "username" || lower == "handle" || lower == "nickname" ||
		lower == "firstname" || lower == "lastname" || lower == "fullname" ||
		lower == "middlename" || lower == "suffix" || lower == "prefix" ||
		strings.HasSuffix(lower, "_name") || strings.HasSuffix(lower, "_title") ||
		strings.HasSuffix(lower, "_code") || strings.HasSuffix(lower, "_sku") {
		return "TEXT"
	}

	// Long text / descriptions
	if strings.Contains(lower, "description") || strings.Contains(lower, "content") ||
		strings.Contains(lower, "body") || strings.Contains(lower, "text") ||
		strings.Contains(lower, "comment") || strings.Contains(lower, "note") ||
		strings.Contains(lower, "message") || strings.Contains(lower, "bio") ||
		strings.Contains(lower, "summary") || strings.Contains(lower, "abstract") ||
		strings.Contains(lower, "details") || strings.Contains(lower, "excerpt") ||
		strings.HasSuffix(lower, "_desc") || strings.HasSuffix(lower, "_description") {
		return "TEXT"
	}

	// Address fields
	if strings.Contains(lower, "address") || strings.Contains(lower, "street") ||
		strings.Contains(lower, "city") || strings.Contains(lower, "state") ||
		strings.Contains(lower, "country") || strings.Contains(lower, "zip") ||
		strings.Contains(lower, "postal") || strings.Contains(lower, "province") ||
		strings.Contains(lower, "region") || strings.Contains(lower, "territory") ||
		strings.Contains(lower, "district") || strings.Contains(lower, "neighborhood") ||
		strings.Contains(lower, "building") || strings.Contains(lower, "floor") ||
		strings.Contains(lower, "suite") || strings.Contains(lower, "apartment") ||
		strings.Contains(lower, "unit") || strings.HasSuffix(lower, "_addr") {
		return "TEXT"
	}

	// Default to TEXT for everything else
	return "TEXT"
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

// isPrimaryKeyColumn checks if a column name indicates it's a primary key
// Supports common PK naming conventions
func isPrimaryKeyColumn(colName string) bool {
	lower := strings.ToLower(colName)

	// Standard 'id' column
	if lower == "id" {
		return true
	}

	// UUID/GUID patterns
	if lower == "uuid" || lower == "guid" {
		return true
	}

	// Explicit PK patterns
	if lower == "pk" || lower == "key" || lower == "primary_key" {
		return true
	}

	// Common alternatives
	if lower == "code" || lower == "slug" || strings.HasSuffix(lower, "_code") || strings.HasSuffix(lower, "_slug") {
		return true
	}

	return false
}
