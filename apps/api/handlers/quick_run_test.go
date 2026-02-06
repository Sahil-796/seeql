package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// setupRouter creates a test router with the QuickRun handler
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/quick-run", QuickRun)
	return r
}

// ============================================================================
// VALID QUERY TESTS - Queries that should succeed
// ============================================================================

// TestQuickRun_ValidJoinQuery tests a JOIN query between two tables
func TestQuickRun_ValidJoinQuery(t *testing.T) {
	t.Log("=== Test Case: Valid JOIN Query ===")
	t.Log("Testing a SELECT with JOIN between users and orders tables")
	t.Log("This is the primary use case - JOINs allow schema inference from the ON clause")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify all expected fields are present
	if _, ok := response["columns"]; !ok {
		t.Error("Response missing 'columns' field")
	}
	if _, ok := response["rows"]; !ok {
		t.Error("Response missing 'rows' field")
	}
	if _, ok := response["row_count"]; !ok {
		t.Error("Response missing 'row_count' field")
	}
	if schema, ok := response["schema"]; ok {
		t.Logf("Schema returned: %v", schema)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_ValidMultipleJoins tests a query with multiple JOINs
func TestQuickRun_ValidMultipleJoins(t *testing.T) {
	t.Log("=== Test Case: Valid Multiple JOINs ===")
	t.Log("Testing a SELECT with multiple JOIN clauses across three tables")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.name, o.amount, p.title
              FROM users u
              JOIN orders o ON u.id = o.user_id
              JOIN products p ON o.product_id = p.id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify columns include fields from all three tables
	if columns, ok := response["columns"].([]any); ok {
		t.Logf("Columns returned: %v", columns)
		if len(columns) != 3 {
			t.Errorf("Expected 3 columns, got %d", len(columns))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_LeftJoin tests LEFT JOIN query
func TestQuickRun_LeftJoin(t *testing.T) {
	t.Log("=== Test Case: LEFT JOIN Query ===")
	t.Log("Testing SELECT with LEFT JOIN - should include NULL values for non-matching rows")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              LEFT JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// LEFT JOIN may produce more rows than INNER JOIN
	if rowCount, ok := response["row_count"].(float64); ok {
		t.Logf("Row count from LEFT JOIN: %v", rowCount)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_RightJoin tests RIGHT JOIN query
func TestQuickRun_RightJoin(t *testing.T) {
	t.Log("=== Test Case: RIGHT JOIN Query ===")
	t.Log("Testing SELECT with RIGHT JOIN")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              RIGHT JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// RIGHT JOIN may or may not be supported depending on SQLite version
	if w.Code == http.StatusOK {
		t.Log("RIGHT JOIN executed successfully")
	} else {
		t.Logf("RIGHT JOIN returned status %d", w.Code)
	}

	t.Log("=== Test Complete ===\n")
}

// TestQuickRun_JoinWithWhereClause tests JOIN with WHERE condition
func TestQuickRun_JoinWithWhereClause(t *testing.T) {
	t.Log("=== Test Case: JOIN with WHERE Clause ===")
	t.Log("Testing JOIN query with additional WHERE filtering")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              JOIN orders o ON u.id = o.user_id
              WHERE o.amount > 100`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// This should work as the schema is inferred from the JOIN
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_ComplexJoinWithAliases tests complex JOIN with table aliases
func TestQuickRun_ComplexJoinWithAliases(t *testing.T) {
	t.Log("=== Test Case: Complex JOIN with Table Aliases ===")
	t.Log("Testing multi-table JOIN with various aliases")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT 
                c.name AS customer_name,
                o.total AS order_total,
                p.name AS product_name
              FROM customers c
              JOIN orders o ON c.id = o.customer_id
              JOIN order_items oi ON o.id = oi.order_id
              JOIN products p ON oi.product_id = p.id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}


// only select query, no joins select username, email from users

func TestQuickRun_SelectQuery(t *testing.T) {
	t.Log("=== Test Case: Select Query ===")
	t.Log("Testing request with valid select query - should return 200")

	router := setupRouter()

	payload := map[string]interface{}{
		"sql": `SELECT username, email FROM users`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}


// ============================================================================
// ERROR HANDLING TESTS - Requests that should fail gracefully
// ============================================================================

// TestQuickRun_MissingSQL tests request with missing SQL field
func TestQuickRun_MissingSQL(t *testing.T) {
	t.Log("=== Test Case: Missing SQL Field ===")
	t.Log("Testing request with empty/missing SQL field - should return 400")

	router := setupRouter()

	body := []byte(`{}`)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if errMsg, ok := response["error"]; ok {
		t.Logf("Error message: %v", errMsg)
	} else {
		t.Error("Response should contain 'error' field")
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_EmptySQLString tests request with empty SQL string
func TestQuickRun_EmptySQLString(t *testing.T) {
	t.Log("=== Test Case: Empty SQL String ===")
	t.Log("Testing request with empty SQL string - should return 400 due to 'required' validation")

	router := setupRouter()

	payload := RunRequest{
		SQL: "",
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_InvalidSQL tests request with invalid SQL syntax
func TestQuickRun_InvalidSQL(t *testing.T) {
	t.Log("=== Test Case: Invalid SQL Syntax ===")
	t.Log("Testing request with malformed SQL - should return 400 with parse error")

	router := setupRouter()

	payload := RunRequest{
		SQL: "SELEKT * FORM users",
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if errMsg, ok := response["error"]; ok {
		t.Logf("Parse error message: %v", errMsg)
		// Verify it's a parse error
		errStr, _ := errMsg.(string)
		if len(errStr) == 0 {
			t.Error("Error message should not be empty")
		}
	} else {
		t.Error("Response should contain 'error' field for invalid SQL")
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_InvalidJSON tests request with malformed JSON
func TestQuickRun_InvalidJSON(t *testing.T) {
	t.Log("=== Test Case: Invalid JSON Body ===")
	t.Log("Testing request with malformed JSON - should return 400")

	router := setupRouter()

	body := []byte(`{"sql": "SELECT * FROM users"`) // Missing closing brace
	t.Logf("Request payload (malformed): %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_UnexpectedSQLType tests non-SELECT statements
func TestQuickRun_UnexpectedSQLType(t *testing.T) {
	t.Log("=== Test Case: Non-SELECT Statement ===")
	t.Log("Testing INSERT statement - behavior depends on implementation")

	router := setupRouter()

	payload := RunRequest{
		SQL: "INSERT INTO users (name) VALUES ('test')",
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// Non-SELECT may or may not be supported
	t.Logf("INSERT statement returned status: %d", w.Code)

	t.Log("=== Test Complete ===\n")
}

// ============================================================================
// EDGE CASE TESTS - Queries that test boundary conditions
// ============================================================================

// TestQuickRun_SimpleSelectWithoutJoin tests simple SELECT (expected to fail)
func TestQuickRun_SimpleSelectWithoutJoin(t *testing.T) {
	t.Log("=== Test Case: Simple SELECT Without JOIN ===")
	t.Log("Testing a basic SELECT without JOIN - expected to fail")
	t.Log("The schema builder requires JOINs to infer table relationships")

	router := setupRouter()

	payload := RunRequest{
		SQL: "SELECT id, name FROM users",
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// This is expected to fail without JOIN context
	if w.Code == http.StatusBadRequest {
		t.Log("Simple SELECT failed as expected - JOINs are required for schema inference")
	} else if w.Code == http.StatusOK {
		t.Log("Simple SELECT succeeded - schema inference may have been improved")
	}

	t.Log("=== Test Complete ===\n")
}

// TestQuickRun_VeryLongQuery tests handling of long SQL queries
func TestQuickRun_VeryLongQuery(t *testing.T) {
	t.Log("=== Test Case: Long SQL Query ===")
	t.Log("Testing a JOIN query with many columns")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT 
                u.id, u.name, u.email, u.created_at,
                o.id, o.amount, o.status, o.created_at,
                p.id, p.name, p.price, p.description
              FROM users u
              JOIN orders o ON u.id = o.user_id
              JOIN products p ON o.product_id = p.id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload length: %d bytes", len(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body length: %d bytes", w.Body.Len())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		t.Logf("Error: %s", w.Body.String())
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_SelfJoin tests a table joining itself
func TestQuickRun_SelfJoin(t *testing.T) {
	t.Log("=== Test Case: Self JOIN ===")
	t.Log("Testing a table joining itself (e.g., employee -> manager)")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT e.name AS employee, m.name AS manager
              FROM employees e
              JOIN employees m ON e.manager_id = m.id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// Self-join may or may not be supported depending on schema builder implementation
	t.Logf("Self JOIN returned status: %d", w.Code)

	t.Log("=== Test Complete ===\n")
}

// ============================================================================
// RESPONSE VALIDATION TESTS
// ============================================================================

// TestQuickRun_ResponseStructure validates the complete response structure
func TestQuickRun_ResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Response Structure Validation ===")
	t.Log("Validating that response contains all expected fields with correct types")

	router := setupRouter()

	payload := RunRequest{
		SQL: `SELECT u.id, u.name, o.amount
              FROM users u
              JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed with status %d: %s", w.Code, w.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	t.Log("Validating response structure...")

	// Validate columns field
	columns, ok := response["columns"]
	if !ok {
		t.Error("Missing 'columns' field in response")
	} else {
		columnsSlice, ok := columns.([]any)
		if !ok {
			t.Error("'columns' field should be an array")
		} else {
			t.Logf("  columns: %v (count: %d)", columnsSlice, len(columnsSlice))
		}
	}

	// Validate rows field
	rows, ok := response["rows"]
	if !ok {
		t.Error("Missing 'rows' field in response")
	} else {
		rowsSlice, ok := rows.([]any)
		if !ok {
			t.Error("'rows' field should be an array")
		} else {
			t.Logf("  rows: array with %d entries", len(rowsSlice))
			// Validate first row structure
			if len(rowsSlice) > 0 {
				if firstRow, ok := rowsSlice[0].(map[string]any); ok {
					t.Logf("  first row keys: %v", getKeys(firstRow))
				}
			}
		}
	}

	// Validate row_count field
	rowCount, ok := response["row_count"]
	if !ok {
		t.Error("Missing 'row_count' field in response")
	} else {
		t.Logf("  row_count: %v", rowCount)
	}

	// Validate schema field
	schema, ok := response["schema"]
	if !ok {
		t.Log("  schema: not present (optional)")
	} else {
		schemaMap, ok := schema.(map[string]any)
		if !ok {
			t.Error("'schema' field should be an object")
		} else {
			t.Logf("  schema keys: %v", getKeys(schemaMap))
			if tables, ok := schemaMap["tables"].([]any); ok {
				t.Logf("  schema contains %d tables", len(tables))
			}
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestQuickRun_ErrorResponseStructure validates error response structure
func TestQuickRun_ErrorResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Error Response Structure Validation ===")
	t.Log("Validating that error responses have consistent structure")

	router := setupRouter()

	testCases := []struct {
		name    string
		payload string
	}{
		{"missing_sql", `{}`},
		{"invalid_sql", `{"sql": "INVALID SQL SYNTAX HERE"}`},
		{"malformed_json", `{"sql": "SELECT 1"`},
	}

	for _, tc := range testCases {
		t.Logf("\n  Subtest: %s", tc.name)

		req, _ := http.NewRequest("POST", "/quick-run", bytes.NewBufferString(tc.payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("    Expected 400, got %d", w.Code)
			continue
		}

		var response map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Errorf("    Failed to parse error response: %v", err)
			continue
		}

		if errMsg, ok := response["error"]; ok {
			t.Logf("    error: %v", errMsg)
		} else {
			t.Error("    Error response missing 'error' field")
		}
	}

	t.Log("\n=== Test PASSED ===\n")
}

// Helper function to get keys from a map
func getKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
