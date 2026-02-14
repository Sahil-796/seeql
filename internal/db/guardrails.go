package db

import (
	"fmt"
	"regexp"
	"strings"
)

// this file contains mostly guardrails for SQL queries
// 
const (
	MaxQueryLength      = 10000 // 10KB
	MaxRowsPerQuery     = 1000
	MaxJoinsPerQuery    = 10
	MaxTablesPerSession = 50 // Maximum tables allowed per session/playground
)

var (
	dangerousPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)\bPRAGMA\b`),             // PRAGMA commands
		regexp.MustCompile(`(?i)\bATTACH\s+DATABASE\b`),  // Attach other databases
		regexp.MustCompile(`(?i)\bDETACH\s+DATABASE\b`),  // Detach databases
		regexp.MustCompile(`(?i)load_extension\s*\(`),    // Load extensions (should be disabled, but block anyway)
		regexp.MustCompile(`(?i)\brandomblob\s*\(`),      // Memory exhaustion
		regexp.MustCompile(`(?i)\bzeroblob\s*\(`),        // Memory exhaustion
		regexp.MustCompile(`(?i)\bgenerate_series\s*\(`), // CPU exhaustion
		regexp.MustCompile(`(?i)UNION\s+SELECT`),         // SQL injection patterns
		regexp.MustCompile(`(?i);\s*DROP\s+`),            // Multi-statement injection
		regexp.MustCompile(`(?i);\s*DELETE\s+`),          // Multi-statement injection
		regexp.MustCompile(`(?i);\s*INSERT\s+`),          // Multi-statement injection
		regexp.MustCompile(`(?i);\s*UPDATE\s+`),          // Multi-statement injection
	}

	limitRegex = regexp.MustCompile(`(?i)\bLIMIT\s+\d+`)
	joinRegex  = regexp.MustCompile(`(?i)\bJOIN\b`)
)

func ValidateQuery(query string) error {
	if len(query) > MaxQueryLength {
		return fmt.Errorf("query exceeds maximum length of %d characters", MaxQueryLength)
	}

	for _, pattern := range dangerousPatterns {
		if pattern.MatchString(query) {
			return fmt.Errorf("query contains forbidden pattern: %s", pattern.String())
		}
	}

	return nil
}

func ValidateSelectQuery(query string) error {
	if err := ValidateQuery(query); err != nil {
		return err
	}

	joins := len(joinRegex.FindAllString(query, -1))
	if joins > MaxJoinsPerQuery {
		return fmt.Errorf("query contains %d JOINs, maximum allowed is %d", joins, MaxJoinsPerQuery)
	}

	return nil
}

func HasLimit(query string) bool {
	return limitRegex.MatchString(query)
}

func AddRowLimit(query string) string {
	if HasLimit(query) {
		return query
	}

	query = strings.TrimSuffix(query, ";")
	query = strings.TrimSpace(query)

	return query + fmt.Sprintf(" LIMIT %d", MaxRowsPerQuery)
}

func IsSingleStatement(query string) bool {
	inQuote := false
	quoteChar := rune(0)
	semicolonCount := 0

	for _, ch := range query {
		if !inQuote && (ch == '\'' || ch == '"') {
			inQuote = true
			quoteChar = ch
		} else if inQuote && ch == quoteChar {
			inQuote = false
		} else if !inQuote && ch == ';' {
			semicolonCount++
		}
	}

	return semicolonCount == 0
}
