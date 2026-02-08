package generator

import (
	"strings"
	"testing"

	"github.com/Sahil-796/seeql/internal/schema"
)

func TestGenerateNameColumns(t *testing.T) {
	s := &schema.Schema{
		Tables: []schema.TableSchema{
			{
				Name: "users",
				Columns: []schema.ColumnSchema{
					{Name: "id", Type: "INTEGER", IsPrimary: true},
					{Name: "name", Type: "TEXT"},
					{Name: "firstName", Type: "TEXT"},
					{Name: "lastName", Type: "TEXT"},
					{Name: "username", Type: "TEXT"},
					{Name: "city", Type: "TEXT"},
					{Name: "description", Type: "TEXT"},
				},
			},
		},
	}

	gen := New(s)
	data := gen.GenerateData(5)

	users := data["users"]
	if len(users) == 0 {
		t.Fatal("Expected users data")
	}

	for i, row := range users {
		// Check name field is not a long sentence
		name := row["name"].(string)
		if len(name) > 50 {
			t.Errorf("Row %d: name field too long (%d chars): %s", i, len(name), name)
		}
		if strings.Contains(name, ".") && len(name) > 20 {
			t.Errorf("Row %d: name looks like a sentence: %s", i, name)
		}

		// Check firstName is short
		firstName := row["firstName"].(string)
		if len(firstName) > 30 {
			t.Errorf("Row %d: firstName too long: %s", i, firstName)
		}

		// Check lastName is short
		lastName := row["lastName"].(string)
		if len(lastName) > 30 {
			t.Errorf("Row %d: lastName too long: %s", i, lastName)
		}

		// Check username is reasonable
		username := row["username"].(string)
		if len(username) > 50 {
			t.Errorf("Row %d: username too long: %s", i, username)
		}

		// Check city is reasonable
		city := row["city"].(string)
		if len(city) > 50 {
			t.Errorf("Row %d: city too long: %s", i, city)
		}

		// Description CAN be longer (it's meant to be)
		desc := row["description"].(string)
		if len(desc) < 10 {
			t.Errorf("Row %d: description unexpectedly short: %s", i, desc)
		}
	}

	t.Logf("Sample data: name=%q, firstName=%q, city=%q",
		users[0]["name"], users[0]["firstName"], users[0]["city"])
}

func TestGenerateTextByColumnName(t *testing.T) {
	s := &schema.Schema{Tables: []schema.TableSchema{}}
	gen := New(s)

	tests := []struct {
		colName string
		maxLen  int
		desc    string
	}{
		{"name", 50, "full name"},
		{"firstName", 20, "first name"},
		{"lastName", 20, "last name"},
		{"city", 30, "city name"},
		{"title", 50, "short title"},
		{"status", 15, "status value"},
	}

	for _, tt := range tests {
		col := schema.ColumnSchema{Name: tt.colName, Type: "TEXT"}
		value := gen.generateTextByColumnName(col).(string)

		if len(value) > tt.maxLen {
			t.Errorf("%s: got %d chars, want <= %d: %q",
				tt.desc, len(value), tt.maxLen, value)
		}
		t.Logf("%s: %q (len=%d)", tt.colName, value, len(value))
	}
}
