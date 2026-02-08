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

	// Second statement: SELECT from users table - cumulative schema now has all columns!
	result2, err := mode.Run("SELECT * FROM users")
	if err != nil {
		t.Fatalf("Second query failed: %v", err)
	}

	if result2.RowCount == 0 {
		t.Error("Expected some rows from second query")
	}

	// With cumulative schema, users table now has [id, name, email, created_at]
	if len(result2.Columns) != 4 {
		t.Errorf("Expected 4 columns (id, name, email, created_at), got: %d (%v)",
			len(result2.Columns), result2.Columns)
	}

	t.Logf("Second query: Got %d rows with columns: %v", result2.RowCount, result2.Columns)
}

func TestQuickModeSelectStar(t *testing.T) {
	mode := NewQuickMode()
	defer mode.Close()

	// Test SELECT * FROM users - should generate default columns
	result, err := mode.Run("SELECT * FROM users")
	if err != nil {
		t.Fatalf("SELECT * FROM users failed: %v", err)
	}

	if result.RowCount == 0 {
		t.Error("Expected some rows to be generated")
	}

	// Should have default columns: id, name, email, created_at
	if len(result.Columns) != 4 {
		t.Errorf("Expected 4 columns (id, name, email, created_at), got: %d (%v)",
			len(result.Columns), result.Columns)
	}

	t.Logf("Success! Got %d rows with columns: %v", result.RowCount, result.Columns)

	// Test SELECT * FROM posts
	mode2 := NewQuickMode()
	defer mode2.Close()

	result2, err := mode2.Run("SELECT * FROM posts")
	if err != nil {
		t.Fatalf("SELECT * FROM posts failed: %v", err)
	}

	// Should have default columns: id, title, content, user_id, created_at
	if len(result2.Columns) != 5 {
		t.Errorf("Expected 5 columns for posts, got: %d (%v)",
			len(result2.Columns), result2.Columns)
	}

	t.Logf("Success! Got %d rows with columns: %v", result2.RowCount, result2.Columns)
}

func TestQuickModeStarThenExplicitColumns(t *testing.T) {
	mode := NewQuickMode()
	defer mode.Close()

	// First: SELECT * FROM users (creates table with id, name, email, created_at)
	result1, err := mode.Run("SELECT * FROM users")
	if err != nil {
		t.Fatalf("First query failed: %v", err)
	}
	t.Logf("First query: Got %d rows with columns: %v", result1.RowCount, result1.Columns)

	// Second: SELECT id, name FROM users (should work - cumulative schema has all columns)
	result2, err := mode.Run("SELECT id, name FROM users")
	if err != nil {
		t.Fatalf("Second query failed: %v", err)
	}

	if len(result2.Columns) != 2 {
		t.Errorf("Expected 2 columns (id, name), got: %d (%v)",
			len(result2.Columns), result2.Columns)
	}

	t.Logf("Second query: Got %d rows with columns: %v", result2.RowCount, result2.Columns)

	// Third: SELECT * FROM users again (should show all columns)
	result3, err := mode.Run("SELECT * FROM users")
	if err != nil {
		t.Fatalf("Third query failed: %v", err)
	}

	if len(result3.Columns) != 4 {
		t.Errorf("Expected 4 columns, got: %d (%v)",
			len(result3.Columns), result3.Columns)
	}

	t.Logf("Third query: Got %d rows with columns: %v", result3.RowCount, result3.Columns)
}
