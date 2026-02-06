package parser

import (
	"testing"
)

func TestExtractColumnsWithoutJoin(t *testing.T) {
	// Test simple SELECT without JOIN
	sql := "SELECT id, name FROM users"
	stmt, err := Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse: %v", err)
	}

	aliases := ExtractTables(stmt)
	t.Logf("Aliases: %v", aliases)

	columns := ExtractColumns(stmt, aliases)
	t.Logf("Columns: %v", columns)

	// Should have users table with id and name columns
	if _, ok := columns["users"]; !ok {
		t.Errorf("Expected 'users' table in columns, got: %v", columns)
	}

	userCols := columns["users"]
	if len(userCols) != 2 {
		t.Errorf("Expected 2 columns for users, got: %d (%v)", len(userCols), userCols)
	}

	// Check that we don't have empty string as table name
	if _, ok := columns[""]; ok {
		t.Errorf("Should not have empty string as table name, got columns: %v", columns)
	}
}

func TestExtractColumnsWithAlias(t *testing.T) {
	// Test SELECT with table alias
	sql := "SELECT u.id, u.name FROM users u"
	stmt, err := Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse: %v", err)
	}

	aliases := ExtractTables(stmt)
	t.Logf("Aliases: %v", aliases)

	columns := ExtractColumns(stmt, aliases)
	t.Logf("Columns: %v", columns)

	// Should have users table with id and name columns (resolved from alias)
	if _, ok := columns["users"]; !ok {
		t.Errorf("Expected 'users' table in columns, got: %v", columns)
	}
}

func TestExtractColumnsWithJoin(t *testing.T) {
	// Test SELECT with JOIN (original working case)
	sql := "SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id"
	stmt, err := Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse: %v", err)
	}

	aliases := ExtractTables(stmt)
	t.Logf("Aliases: %v", aliases)

	columns := ExtractColumns(stmt, aliases)
	t.Logf("Columns: %v", columns)

	// Should have both tables
	if _, ok := columns["users"]; !ok {
		t.Errorf("Expected 'users' table in columns, got: %v", columns)
	}
	if _, ok := columns["orders"]; !ok {
		t.Errorf("Expected 'orders' table in columns, got: %v", columns)
	}
}
