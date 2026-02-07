package parser

import (
	"testing"
)

func TestExtractAggregations(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected int
		check    func(t *testing.T, aggs []AggregateExpr)
	}{
		{
			name:     "COUNT star",
			sql:      "SELECT COUNT(*) FROM users",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggCount {
					t.Errorf("Expected COUNT, got %s", aggs[0].Type)
				}
				if !aggs[0].IsStar {
					t.Error("Expected IsStar to be true")
				}
			},
		},
		{
			name:     "COUNT column",
			sql:      "SELECT COUNT(id) FROM users",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Column != "id" {
					t.Errorf("Expected column 'id', got '%s'", aggs[0].Column)
				}
			},
		},
		{
			name:     "SUM",
			sql:      "SELECT SUM(amount) FROM orders",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggSum {
					t.Errorf("Expected SUM, got %s", aggs[0].Type)
				}
				if aggs[0].Column != "amount" {
					t.Errorf("Expected column 'amount', got '%s'", aggs[0].Column)
				}
			},
		},
		{
			name:     "AVG",
			sql:      "SELECT AVG(price) FROM products",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggAvg {
					t.Errorf("Expected AVG, got %s", aggs[0].Type)
				}
			},
		},
		{
			name:     "MIN",
			sql:      "SELECT MIN(created_at) FROM users",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggMin {
					t.Errorf("Expected MIN, got %s", aggs[0].Type)
				}
			},
		},
		{
			name:     "MAX",
			sql:      "SELECT MAX(age) FROM users",
			expected: 1,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggMax {
					t.Errorf("Expected MAX, got %s", aggs[0].Type)
				}
			},
		},
		{
			name:     "Multiple aggregates",
			sql:      "SELECT COUNT(*), SUM(amount), AVG(price) FROM orders",
			expected: 3,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Type != AggCount || aggs[1].Type != AggSum || aggs[2].Type != AggAvg {
					t.Error("Types don't match expected order")
				}
			},
		},
		{
			name:     "Aggregates with aliases",
			sql:      "SELECT COUNT(*) as total, SUM(amount) as total_amount FROM orders",
			expected: 2,
			check: func(t *testing.T, aggs []AggregateExpr) {
				if aggs[0].Alias != "total" {
					t.Errorf("Expected alias 'total', got '%s'", aggs[0].Alias)
				}
				if aggs[1].Alias != "total_amount" {
					t.Errorf("Expected alias 'total_amount', got '%s'", aggs[1].Alias)
				}
			},
		},
		{
			name:     "No aggregates",
			sql:      "SELECT id, name FROM users",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stmt, err := Parse(tt.sql)
			if err != nil {
				t.Fatalf("Failed to parse SQL: %v", err)
			}

			aggs := ExtractAggregations(stmt)

			if len(aggs) != tt.expected {
				t.Errorf("Expected %d aggregations, got %d", tt.expected, len(aggs))
			}

			if tt.check != nil && len(aggs) > 0 {
				tt.check(t, aggs)
			}
		})
	}
}

func TestHasAggregations(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected bool
	}{
		{"has count", "SELECT COUNT(*) FROM users", true},
		{"has sum", "SELECT SUM(amount) FROM orders", true},
		{"no aggregates", "SELECT id, name FROM users", false},
		{"mixed", "SELECT id, COUNT(*) FROM users", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stmt, err := Parse(tt.sql)
			if err != nil {
				t.Fatalf("Failed to parse SQL: %v", err)
			}

			hasAgg := HasAggregations(stmt)
			if hasAgg != tt.expected {
				t.Errorf("Expected HasAggregations=%v, got %v", tt.expected, hasAgg)
			}
		})
	}
}

func TestGetAggregationReturnType(t *testing.T) {
	tests := []struct {
		aggType  AggregateType
		expected string
	}{
		{AggCount, "INTEGER"},
		{AggSum, "FLOAT"},
		{AggAvg, "FLOAT"},
		{AggMin, "TEXT"},
		{AggMax, "TEXT"},
	}

	for _, tt := range tests {
		t.Run(string(tt.aggType), func(t *testing.T) {
			result := GetAggregationReturnType(tt.aggType)
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}
