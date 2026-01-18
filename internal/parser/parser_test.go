package parser

import "testing"

func TestParse(t *testing.T) {
	sql := "SELECT * FROM users"
	stmt, err := Parse(sql)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if stmt == nil {
		t.Fatal("expected statement, got nil")
	}
}
