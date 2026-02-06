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
