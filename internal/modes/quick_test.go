package modes

import (
	"testing"
)

func TestQuickModeSimpleSelect(t *testing.T) {
	mode := NewQuickMode()
	defer mode.Close()

	// Test simple SELECT without JOIN
	result, err := mode.Run("SELECT id, name FROM users")
	if err != nil {
		t.Fatalf("QuickMode.Run failed: %v", err)
	}

	if result.RowCount == 0 {
		t.Error("Expected some rows to be generated")
	}

	if len(result.Columns) != 2 {
		t.Errorf("Expected 2 columns (id, name), got: %d", len(result.Columns))
	}

	t.Logf("Success! Got %d rows with columns: %v", result.RowCount, result.Columns)
}

func TestQuickModeWithJoin(t *testing.T) {
	mode := NewQuickMode()
	defer mode.Close()

	// Test SELECT with JOIN (original working case)
	result, err := mode.Run("SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id")
	if err != nil {
		t.Fatalf("QuickMode.Run failed: %v", err)
	}

	if result.RowCount == 0 {
		t.Error("Expected some rows to be generated")
	}

	if len(result.Columns) != 2 {
		t.Errorf("Expected 2 columns (name, amount), got: %d", len(result.Columns))
	}

	t.Logf("Success! Got %d rows with columns: %v", result.RowCount, result.Columns)
}

func TestQuickModeMultipleStatements(t *testing.T) {
	mode := NewQuickMode()
	defer mode.Close()

	// First statement: JOIN query that creates users and posts tables
	result1, err := mode.Run("SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id")
	if err != nil {
		t.Fatalf("First query failed: %v", err)
	}

	if result1.RowCount == 0 {
		t.Error("Expected some rows from first query")
	}

	t.Logf("First query: Got %d rows with columns: %v", result1.RowCount, result1.Columns)

	// Second statement: SELECT from users table - this should work now!
	result2, err := mode.Run("SELECT * FROM users")
	if err != nil {
		t.Fatalf("Second query failed: %v", err)
	}

	if result2.RowCount == 0 {
		t.Error("Expected some rows from second query")
	}

	if len(result2.Columns) != 2 {
		t.Errorf("Expected 2 columns (id, name), got: %d", len(result2.Columns))
	}

	t.Logf("Second query: Got %d rows with columns: %v", result2.RowCount, result2.Columns)
}
