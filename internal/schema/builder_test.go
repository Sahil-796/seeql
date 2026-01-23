package schema

import (
	"testing"

	"github.com/Sahil-796/seeql/internal/parser"
)

func TestBuildSchema(t *testing.T) {
	sql := `
SELECT u.id, u.name, u.email, o.amount, o.order_date, p.product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id
WHERE u.status = 'active'
`

	t.Logf("Testing SQL:\n%s", sql)

	stmt, err := parser.Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse SQL: %v", err)
	}

	t.Log("\n=== Calling BuildSchema ===")
	BuildSchema(stmt)
	t.Log("\n=== BuildSchema completed ===")
}

func TestBuildSchemaSimple(t *testing.T) {
	sql := `SELECT u.name, u.email FROM users u`

	t.Logf("Testing simple SQL:\n%s", sql)

	stmt, err := parser.Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse SQL: %v", err)
	}

	t.Log("\n=== Calling BuildSchema (Simple) ===")
	BuildSchema(stmt)
	t.Log("\n=== BuildSchema completed ===")
}

func TestBuildSchemaWithParser(t *testing.T) {
	sql := `
SELECT u.id, u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
`

	t.Logf("Testing SQL with parser functions:\n%s", sql)

	stmt, err := parser.Parse(sql)
	if err != nil {
		t.Fatalf("Failed to parse SQL: %v", err)
	}

	// Show what the parser extracts
	t.Log("\n=== Parser Output ===")

	columns := parser.ExtractColumns(stmt)
	t.Logf("Columns: %v", columns)

	t.Log("\n=== Calling BuildSchema ===")
	BuildSchema(stmt)
	t.Log("\n=== BuildSchema completed ===")
}
