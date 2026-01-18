package parser

import ("testing"
	"vitess.io/vitess/go/vt/sqlparser"
)

func TestParse(t *testing.T) {
	sql := `
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
`
	stmt, err := Parse(sql)
	t.Logf("%#v", stmt)
	
	sqlparser.Walk(func(node sqlparser.SQLNode) (bool, error) {
		t.Logf("VISITING NODE: %T", node)

		if col, ok := node.(*sqlparser.ColName); ok {
			t.Logf("COLUMN: %s.%s",
				col.Qualifier.Name.String(),
				col.Name.String(),
			)
		}
		return true, nil
}, stmt)


	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if stmt == nil {
		t.Fatal("expected statement, got nil")
	}
}
