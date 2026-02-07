package parser

import (
	"testing"
)

func TestIsCreateTable(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected bool
	}{
		{"CREATE TABLE", "CREATE TABLE users (id INT)", true},
		{"create table lowercase", "create table users (id INT)", true},
		{"SELECT", "SELECT * FROM users", false},
		{"INSERT", "INSERT INTO users VALUES (1)", false},
		{"WITH spaces", "  CREATE TABLE users (id INT)", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsCreateTable(tt.sql)
			if result != tt.expected {
				t.Errorf("IsCreateTable(%q) = %v, want %v", tt.sql, result, tt.expected)
			}
		})
	}
}

func TestParseCreateTable(t *testing.T) {
	tests := []struct {
		name      string
		sql       string
		wantTable string
		wantCols  int
		wantErr   bool
	}{
		{
			name:      "simple table",
			sql:       "CREATE TABLE users (id INT, name VARCHAR(100))",
			wantTable: "users",
			wantCols:  2,
			wantErr:   false,
		},
		{
			name:      "with primary key",
			sql:       "CREATE TABLE orders (id INT PRIMARY KEY, amount DECIMAL(10,2))",
			wantTable: "orders",
			wantCols:  2,
			wantErr:   false,
		},
		{
			name:      "with NOT NULL",
			sql:       "CREATE TABLE products (id INT NOT NULL, name VARCHAR(255) NOT NULL)",
			wantTable: "products",
			wantCols:  2,
			wantErr:   false,
		},
		{
			name:    "not create table",
			sql:     "SELECT * FROM users",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			createTable, err := ParseCreateTable(tt.sql)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseCreateTable() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}

			if createTable.Table.Name.String() != tt.wantTable {
				t.Errorf("Table name = %v, want %v", createTable.Table.Name.String(), tt.wantTable)
			}

			if len(createTable.TableSpec.Columns) != tt.wantCols {
				t.Errorf("Column count = %v, want %v", len(createTable.TableSpec.Columns), tt.wantCols)
			}
		})
	}
}

func TestExtractSchemaFromDDL(t *testing.T) {
	tests := []struct {
		name         string
		sql          string
		checkTable   string
		checkColumns []struct {
			name      string
			colType   string
			nullable  bool
			isPrimary bool
		}
	}{
		{
			name:       "basic columns",
			sql:        "CREATE TABLE users (id INT, name VARCHAR(100))",
			checkTable: "users",
			checkColumns: []struct {
				name      string
				colType   string
				nullable  bool
				isPrimary bool
			}{
				{"id", "INTEGER", true, false},
				{"name", "TEXT", true, false},
			},
		},
		{
			name:       "with primary key",
			sql:        "CREATE TABLE orders (id INT PRIMARY KEY, amount DECIMAL(10,2))",
			checkTable: "orders",
			checkColumns: []struct {
				name      string
				colType   string
				nullable  bool
				isPrimary bool
			}{
				{"id", "INTEGER", true, true},
				{"amount", "FLOAT", true, false},
			},
		},
		{
			name:       "with NOT NULL",
			sql:        "CREATE TABLE products (id INT NOT NULL, name VARCHAR(255))",
			checkTable: "products",
			checkColumns: []struct {
				name      string
				colType   string
				nullable  bool
				isPrimary bool
			}{
				{"id", "INTEGER", false, false},
				{"name", "TEXT", true, false},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			createTable, err := ParseCreateTable(tt.sql)
			if err != nil {
				t.Fatalf("ParseCreateTable failed: %v", err)
			}

			parsed, err := ExtractSchemaFromDDL(createTable)
			if err != nil {
				t.Fatalf("ExtractSchemaFromDDL failed: %v", err)
			}

			if parsed.TableName != tt.checkTable {
				t.Errorf("Table name = %v, want %v", parsed.TableName, tt.checkTable)
			}

			if len(parsed.Columns) != len(tt.checkColumns) {
				t.Fatalf("Column count = %v, want %v", len(parsed.Columns), len(tt.checkColumns))
			}

			for i, col := range parsed.Columns {
				expected := tt.checkColumns[i]
				if col.Name != expected.name {
					t.Errorf("Column[%d].Name = %v, want %v", i, col.Name, expected.name)
				}
				if col.Type != expected.colType {
					t.Errorf("Column[%d].Type = %v, want %v", i, col.Type, expected.colType)
				}
				if col.Nullable != expected.nullable {
					t.Errorf("Column[%d].Nullable = %v, want %v", i, col.Nullable, expected.nullable)
				}
				if col.IsPrimary != expected.isPrimary {
					t.Errorf("Column[%d].IsPrimary = %v, want %v", i, col.IsPrimary, expected.isPrimary)
				}
			}
		})
	}
}

func TestMapSQLTypeToInternal(t *testing.T) {
	tests := []struct {
		sqlType  string
		expected string
	}{
		{"INT", "INTEGER"},
		{"INTEGER", "INTEGER"},
		{"BIGINT", "INTEGER"},
		{"FLOAT", "FLOAT"},
		{"DECIMAL", "FLOAT"},
		{"BOOLEAN", "BOOLEAN"},
		{"DATE", "DATE"},
		{"DATETIME", "TIMESTAMP"},
		{"TIMESTAMP", "TIMESTAMP"},
		{"JSON", "JSON"},
		{"UUID", "UUID"},
		{"VARCHAR", "TEXT"},
		{"TEXT", "TEXT"},
		{"CHAR", "TEXT"},
	}

	for _, tt := range tests {
		t.Run(tt.sqlType, func(t *testing.T) {
			result := mapSQLTypeToInternal(tt.sqlType)
			if result != tt.expected {
				t.Errorf("mapSQLTypeToInternal(%q) = %v, want %v", tt.sqlType, result, tt.expected)
			}
		})
	}
}
