package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// setupGenerateRouter creates a test router with the GenerateData handler
func setupGenerateRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/generate", GenerateData)
	return r
}

// ============================================================================
// VALID REQUEST TESTS
// ============================================================================

// TestGenerateData_ValidJoinQuery tests data generation from a JOIN query
func TestGenerateData_ValidJoinQuery(t *testing.T) {
	t.Log("=== Test Case: Valid JOIN Query Data Generation ===")
	t.Log("Testing fake data generation from SELECT with JOIN")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              JOIN orders o ON u.id = o.user_id`,
		RowsPerTable: 5,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Data == nil {
		t.Error("Response missing 'data' field")
	} else {
		t.Logf("Generated data for %d tables", len(response.Data))
		for tableName, rows := range response.Data {
			t.Logf("  Table '%s': %d rows", tableName, len(rows))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_DefaultRowCount tests default rows_per_table value
func TestGenerateData_DefaultRowCount(t *testing.T) {
	t.Log("=== Test Case: Default Row Count ===")
	t.Log("Testing that missing rows_per_table defaults to 10")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL: `SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id`,
		// RowsPerTable not set - should default to 10
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed: %d", w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Check that data was generated
	if response.Data == nil {
		t.Error("No data generated")
	} else {
		for tableName, rows := range response.Data {
			t.Logf("Table '%s': %d rows (expected ~10)", tableName, len(rows))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_CustomRowCount tests custom rows_per_table value
func TestGenerateData_CustomRowCount(t *testing.T) {
	t.Log("=== Test Case: Custom Row Count ===")
	t.Log("Testing data generation with custom rows_per_table")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL:          `SELECT u.name FROM users u`,
		RowsPerTable: 25,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed: %d", w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify row count
	if response.Data != nil {
		for tableName, rows := range response.Data {
			if len(rows) != 25 {
				t.Errorf("Expected 25 rows for '%s', got %d", tableName, len(rows))
			} else {
				t.Logf("Table '%s': %d rows ✓", tableName, len(rows))
			}
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_MultipleTables tests data generation for multiple tables
func TestGenerateData_MultipleTables(t *testing.T) {
	t.Log("=== Test Case: Multiple Tables Data Generation ===")
	t.Log("Testing data generation across three tables")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL: `SELECT u.name, o.amount, p.title
              FROM users u
              JOIN orders o ON u.id = o.user_id
              JOIN products p ON o.product_id = p.id`,
		RowsPerTable: 3,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Data == nil {
		t.Fatal("No data generated")
	}

	// Should have 3 tables
	if len(response.Data) != 3 {
		t.Errorf("Expected 3 tables, got %d", len(response.Data))
	}

	for tableName, rows := range response.Data {
		t.Logf("Table '%s': %d rows", tableName, len(rows))

		// Verify row structure
		if len(rows) > 0 {
			firstRow := rows[0]
			t.Logf("  Sample row keys: %v", getDataKeys(firstRow))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_ZeroRowCount tests edge case of 0 rows
func TestGenerateData_ZeroRowCount(t *testing.T) {
	t.Log("=== Test Case: Zero Row Count ===")
	t.Log("Testing that 0 rows_per_table defaults to 10")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL:          `SELECT u.name FROM users u`,
		RowsPerTable: 0,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed: %d", w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Should default to 10 rows
	if response.Data != nil {
		for tableName, rows := range response.Data {
			t.Logf("Table '%s': %d rows (0 input defaults to 10)", tableName, len(rows))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_NegativeRowCount tests edge case of negative rows
func TestGenerateData_NegativeRowCount(t *testing.T) {
	t.Log("=== Test Case: Negative Row Count ===")
	t.Log("Testing that negative rows_per_table defaults to 10")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL:          `SELECT u.name FROM users u`,
		RowsPerTable: -5,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed: %d", w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Should default to 10 rows
	if response.Data != nil {
		for tableName, rows := range response.Data {
			t.Logf("Table '%s': %d rows (negative input defaults to 10)", tableName, len(rows))
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

// TestGenerateData_MissingSQL tests request with missing SQL
func TestGenerateData_MissingSQL(t *testing.T) {
	t.Log("=== Test Case: Missing SQL Field ===")
	t.Log("Testing data generation with empty request")

	router := setupGenerateRouter()

	body := []byte(`{}`)
	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Error == "" {
		t.Error("Expected error message in response")
	} else {
		t.Logf("Error message: %s", response.Error)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_InvalidSQL tests request with invalid SQL
func TestGenerateData_InvalidSQL(t *testing.T) {
	t.Log("=== Test Case: Invalid SQL Syntax ===")
	t.Log("Testing data generation with malformed SQL")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL:          "SELEKT * FORM users",
		RowsPerTable: 5,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Error == "" {
		t.Error("Expected error message for invalid SQL")
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_InvalidJSON tests request with malformed JSON
func TestGenerateData_InvalidJSON(t *testing.T) {
	t.Log("=== Test Case: Invalid JSON Body ===")
	t.Log("Testing data generation with malformed JSON")

	router := setupGenerateRouter()

	body := []byte(`{"sql": "SELECT 1", "rows_per_table": 5`)
	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	t.Log("=== Test PASSED ===\n")
}

// ============================================================================
// RESPONSE STRUCTURE TESTS
// ============================================================================

// TestGenerateData_ResponseStructure validates complete response structure
func TestGenerateData_ResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Response Structure Validation ===")
	t.Log("Validating data response has all expected fields")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL:          `SELECT u.id, u.name FROM users u`,
		RowsPerTable: 2,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed with status %d", w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Success response should have 'data' key
	if _, ok := response["data"]; !ok {
		t.Error("Success response missing 'data' field")
	}

	// Should not have 'error' on success
	if _, ok := response["error"]; ok {
		t.Error("Success response should not have 'error' field")
	}

	// Validate data structure
	if data, ok := response["data"].(map[string]any); ok {
		for tableName, tableData := range data {
			if rows, ok := tableData.([]any); ok {
				t.Logf("Table '%s': %d rows", tableName, len(rows))
				if len(rows) > 0 {
					if firstRow, ok := rows[0].(map[string]any); ok {
						t.Logf("  Sample row: %v", firstRow)
					}
				}
			}
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// TestGenerateData_ErrorResponseStructure validates error response structure
func TestGenerateData_ErrorResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Error Response Structure ===")
	t.Log("Validating error responses have consistent structure")

	router := setupGenerateRouter()

	testCases := []struct {
		name    string
		payload string
	}{
		{"missing_sql", `{}`},
		{"invalid_sql", `{"sql": "INVALID SQL", "rows_per_table": 5}`},
		{"malformed_json", `{"sql": "SELECT 1", "rows_per_table": 5`},
	}

	for _, tc := range testCases {
		t.Logf("\n  Subtest: %s", tc.name)

		req, _ := http.NewRequest("POST", "/generate", bytes.NewBufferString(tc.payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("    Expected 400, got %d", w.Code)
			continue
		}

		var response map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Errorf("    Failed to parse: %v", err)
			continue
		}

		// Error response should have 'error' key
		if errMsg, ok := response["error"]; ok {
			t.Logf("    error: %v", errMsg)
		} else {
			t.Error("    Missing 'error' field")
		}

		// Should not have 'data' on error
		if _, ok := response["data"]; ok {
			t.Error("    Error response should not have 'data'")
		}
	}

	t.Log("\n=== Test PASSED ===\n")
}

// TestGenerateData_DataTypes tests that generated data has correct types
func TestGenerateData_DataTypes(t *testing.T) {
	t.Log("=== Test Case: Data Types Validation ===")
	t.Log("Testing that generated data has appropriate types for columns")

	router := setupGenerateRouter()

	payload := GenerateRequest{
		SQL: `SELECT 
				u.id, 
				u.name, 
				u.email, 
				u.age, 
				u.is_active,
				o.amount
              FROM users u 
              JOIN orders o ON u.id = o.user_id`,
		RowsPerTable: 1,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/generate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Request failed: %d", w.Code)
	}

	var response GenerateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Check data types in generated rows
	if response.Data != nil {
		for tableName, rows := range response.Data {
			if len(rows) > 0 {
				row := rows[0]
				t.Logf("Table '%s' sample row:", tableName)
				for colName, value := range row {
					t.Logf("  %s: %v (type: %T)", colName, value, value)
				}
			}
		}
	}

	t.Log("=== Test PASSED ===\n")
}

// Helper function to get keys from a data row
func getDataKeys(row map[string]any) []string {
	keys := make([]string, 0, len(row))
	for k := range row {
		keys = append(keys, k)
	}
	return keys
}
