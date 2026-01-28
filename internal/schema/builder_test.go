package schema

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/Sahil-796/seeql/internal/parser"
)

func prettyPrint(t *testing.T, label string, v interface{}) {
	data, err := json.MarshalIndent(v, "  ", "  ")
	if err != nil {
		t.Logf("%s: [error marshaling: %v]", label, err)
		return
	}
	t.Logf("%s:\n  %s", label, string(data))
}

func runSchemaTest(t *testing.T, name string, sql string) {
	t.Helper()

	divider := strings.Repeat("=", 60)
	t.Logf("\n%s", divider)
	t.Logf("TEST: %s", name)
	t.Logf("%s", divider)
	t.Logf("SQL:\n%s", sql)

	stmt, err := parser.Parse(sql)
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	schema := BuildSchema(stmt)

	t.Logf("\n--- INFERRED SCHEMA ---")

	for _, table := range schema.Tables {
		t.Logf("\nTable: %s", table.Name)
		t.Logf("  Columns:")
		for _, col := range table.Columns {
			flags := []string{}
			if col.IsPrimary {
				flags = append(flags, "PK")
			}
			if col.IsForeign {
				if col.RefTable != "" {
					flags = append(flags, "FK -> "+col.RefTable+"."+col.RefColumn)
				} else {
					flags = append(flags, "FK (unknown ref)")
				}
			}
			flagStr := ""
			if len(flags) > 0 {
				flagStr = " [" + strings.Join(flags, ", ") + "]"
			}
			t.Logf("    - %s%s", col.Name, flagStr)
		}
	}

	if len(schema.Relationships) > 0 {
		t.Logf("\n  Relationships:")
		for _, rel := range schema.Relationships {
			t.Logf("    - %s.%s <-> %s.%s", rel.TableA, rel.ColumnA, rel.TableB, rel.ColumnB)
		}
	}

	t.Logf("\n--- JSON OUTPUT ---")
	prettyPrint(t, "Schema", schema)
	t.Logf("%s\n", divider)
}

// =============================================================================
// TEST CASES
// =============================================================================

func TestSimpleSelect(t *testing.T) {
	sql := `SELECT id, name, email FROM users`
	runSchemaTest(t, "Simple SELECT (no alias)", sql)
}

func TestSelectWithAlias(t *testing.T) {
	sql := `SELECT u.id, u.name, u.email FROM users u`
	runSchemaTest(t, "SELECT with table alias", sql)
}

func TestSingleJoin(t *testing.T) {
	sql := `
SELECT u.id, u.name, o.id, o.amount, o.user_id
FROM users u
JOIN orders o ON u.id = o.user_id`
	runSchemaTest(t, "Single JOIN", sql)
}

func TestMultipleJoins(t *testing.T) {
	sql := `
SELECT
    u.id, u.name, u.email,
    o.id, o.amount, o.order_date, o.user_id,
    p.id, p.product_name, p.price
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id`
	runSchemaTest(t, "Multiple JOINs (3 tables)", sql)
}

func TestLeftJoin(t *testing.T) {
	sql := `
SELECT c.id, c.name, o.id, o.total, o.customer_id
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id`
	runSchemaTest(t, "LEFT JOIN", sql)
}

func TestSelfJoin(t *testing.T) {
	sql := `
SELECT e.id, e.name, e.manager_id, m.id, m.name
FROM employees e
JOIN employees m ON e.manager_id = m.id`
	runSchemaTest(t, "Self JOIN (employees -> manager)", sql)
}

func TestComplexQuery(t *testing.T) {
	sql := `
SELECT
    u.id, u.username, u.email,
    p.id, p.title, p.content, p.user_id,
    c.id, c.body, c.post_id, c.user_id,
    l.id, l.post_id, l.user_id
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id
JOIN likes l ON p.id = l.post_id
WHERE u.active = 1`
	runSchemaTest(t, "Complex query (blog schema)", sql)
}

func TestEcommerce(t *testing.T) {
	sql := `
SELECT
    c.id, c.name, c.email,
    o.id, o.order_date, o.status, o.customer_id,
    oi.id, oi.quantity, oi.price, oi.order_id, oi.product_id,
    p.id, p.name, p.sku, p.category_id,
    cat.id, cat.name
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories cat ON p.category_id = cat.id`
	runSchemaTest(t, "E-commerce schema (5 tables)", sql)
}

func TestWithWhereClause(t *testing.T) {
	sql := `
SELECT u.id, u.name, u.status, o.id, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active' AND o.amount > 100`
	runSchemaTest(t, "Query with WHERE clause", sql)
}

func TestWithGroupBy(t *testing.T) {
	sql := `
SELECT u.id, u.name, o.user_id, SUM(o.amount) as total
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, o.user_id`
	runSchemaTest(t, "Query with GROUP BY", sql)
}

func TestWithSubquery(t *testing.T) {
	sql := `
SELECT u.id, u.name
FROM users u
WHERE u.id IN (SELECT o.user_id FROM orders o WHERE o.amount > 1000)`
	runSchemaTest(t, "Query with subquery", sql)
}

func TestManyToMany(t *testing.T) {
	sql := `
SELECT
    s.id, s.name, s.email,
    e.student_id, e.course_id, e.enrolled_at,
    c.id, c.title, c.credits
FROM students s
JOIN enrollments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id`
	runSchemaTest(t, "Many-to-Many (students <-> courses)", sql)
}

func TestNoForeignKeys(t *testing.T) {
	sql := `
SELECT id, first_name, last_name, email, created_at
FROM contacts`
	runSchemaTest(t, "Simple table (no FKs)", sql)
}

func TestUnknownForeignKey(t *testing.T) {
	sql := `
SELECT id, name, department_id, location_id
FROM employees`
	runSchemaTest(t, "FK columns without matching tables", sql)
}

func TestMultipleFKsSameTable(t *testing.T) {
	sql := `
SELECT
    t.id, t.title, t.assignee_id, t.reporter_id,
    a.id, a.name,
    r.id, r.name
FROM tickets t
JOIN users a ON t.assignee_id = a.id
JOIN users r ON t.reporter_id = r.id`
	runSchemaTest(t, "Multiple FKs to same table", sql)
}
