package db

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	// Regex to check if LIMIT already exists
	limitRegex = regexp.MustCompile(`(?i)\bLIMIT\s+\d+`)
)

func validateLength(query string) error {
	if len(query) > 10000 {
		return fmt.Errorf("query length exceeds maximum allowed length of 10000 characters")
	}
	return nil
}

func isLimit(query string) bool {
	return limitRegex.MatchString(query)
}

func applyLimit(query string) string {
	if isLimit(query) {
		return query
	}

	query = strings.TrimSuffix(query, ";")
	query = strings.TrimSpace(query)

	return query + " LIMIT 1000"
}
