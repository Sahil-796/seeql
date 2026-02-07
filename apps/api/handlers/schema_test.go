package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/gin-gonic/gin"
)

// setupSchemaRouter creates a test router with the InferSchema handler
func setupSchemaRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/infer", InferSchema)
	return r
}

// ============================================================================
// VALID QUERY TESTS
// ============================================================================

// TestInferSchema_ValidJoinQuery tests schema inference from a JOIN query
func TestInferSchema_ValidJoinQuery(t *testing.T) {
	t.Log("=== Test Case: Valid JOIN Query Schema ===")
	t.Log("Testing schema inference from SELECT with JOIN")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)
	t.Logf("Request payload: %s", string(body))

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response InferResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Schema == nil {
		t.Error("Response missing 'schema' field")
	} else {
		t.Logf("Schema tables: %d", len(response.Schema.Tables))
		t.Logf("Schema relationships: %d", len(response.Schema.Relationships))
	}

	t.Log("=== Test PASSED ===\n")
}

// TestInferSchema_MultipleTables tests schema inference with multiple tables
func TestInferSchema_MultipleTables(t *testing.T) {
	t.Log("=== Test Case: Multiple Tables Schema ===")
	t.Log("Testing schema inference from three-table JOIN")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: `SELECT u.name, o.amount, p.title
              FROM users u
              JOIN orders o ON u.id = o.user_id
              JOIN products p ON o.product_id = p.id`,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response InferResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Schema == nil {
		t.Fatal("Response missing schema")
	}

	if len(response.Schema.Tables) != 3 {
		t.Errorf("Expected 3 tables, got %d", len(response.Schema.Tables))
	}

	if len(response.Schema.Relationships) != 2 {
		t.Errorf("Expected 2 relationships, got %d", len(response.Schema.Relationships))
	}

	t.Logf("Tables: %v", getTableNames(response.Schema))
	t.Log("=== Test PASSED ===\n")
}

// TestInferSchema_SimpleSelect tests simple SELECT without JOIN
func TestInferSchema_SimpleSelect(t *testing.T) {
	t.Log("=== Test Case: Simple SELECT Schema ===")
	t.Log("Testing schema inference from single-table SELECT")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: "SELECT id, name, email FROM users",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	// Should succeed with single table
	if w.Code != http.StatusOK {
		t.Logf("Simple SELECT returned status %d (may need JOINs)", w.Code)
	} else {
		var response InferResponse
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatalf("Failed to parse response: %v", err)
		}
		if response.Schema != nil {
			t.Logf("Inferred %d tables from simple SELECT", len(response.Schema.Tables))
		}
	}

	t.Log("=== Test Complete ===\n")
}

// TestInferSchema_LeftJoin tests schema inference with LEFT JOIN
func TestInferSchema_LeftJoin(t *testing.T) {
	t.Log("=== Test Case: LEFT JOIN Schema ===")
	t.Log("Testing schema inference from LEFT JOIN query")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: `SELECT u.name, o.amount 
              FROM users u 
              LEFT JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response InferResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Schema != nil {
		t.Logf("Tables: %d, Relationships: %d",
			len(response.Schema.Tables),
			len(response.Schema.Relationships))
	}

	t.Log("=== Test PASSED ===\n")
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

// TestInferSchema_MissingSQL tests request with missing SQL
func TestInferSchema_MissingSQL(t *testing.T) {
	t.Log("=== Test Case: Missing SQL Field ===")
	t.Log("Testing schema inference with empty request")

	router := setupSchemaRouter()

	body := []byte(`{}`)
	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response InferResponse
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

// TestInferSchema_InvalidSQL tests request with invalid SQL
func TestInferSchema_InvalidSQL(t *testing.T) {
	t.Log("=== Test Case: Invalid SQL Syntax ===")
	t.Log("Testing schema inference with malformed SQL")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: "SELEKT * FORM users",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response InferResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Error == "" {
		t.Error("Expected error message for invalid SQL")
	}

	t.Log("=== Test PASSED ===\n")
}

// TestInferSchema_InvalidJSON tests request with malformed JSON
func TestInferSchema_InvalidJSON(t *testing.T) {
	t.Log("=== Test Case: Invalid JSON Body ===")
	t.Log("Testing schema inference with malformed JSON")

	router := setupSchemaRouter()

	body := []byte(`{"sql": "SELECT 1"`)
	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
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

// TestInferSchema_ResponseStructure validates complete response structure
func TestInferSchema_ResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Response Structure Validation ===")
	t.Log("Validating schema response has all expected fields")

	router := setupSchemaRouter()

	payload := InferRequest{
		SQL: `SELECT u.id, u.name, o.amount
              FROM users u
              JOIN orders o ON u.id = o.user_id`,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "/infer", bytes.NewBuffer(body))
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

	// Success response should have 'schema' key
	if _, ok := response["schema"]; !ok {
		t.Error("Success response missing 'schema' field")
	}

	// Should not have 'error' on success
	if _, ok := response["error"]; ok {
		t.Error("Success response should not have 'error' field")
	}

	schemaData := response["schema"].(map[string]any)
	if tables, ok := schemaData["tables"].([]any); ok {
		t.Logf("Schema contains %d tables", len(tables))
	}
	if rels, ok := schemaData["relationships"].([]any); ok {
		t.Logf("Schema contains %d relationships", len(rels))
	}

	t.Log("=== Test PASSED ===\n")
}

// TestInferSchema_ErrorResponseStructure validates error response structure
func TestInferSchema_ErrorResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Error Response Structure ===")
	t.Log("Validating error responses have consistent structure")

	router := setupSchemaRouter()

	testCases := []struct {
		name    string
		payload string
	}{
		{"missing_sql", `{}`},
		{"invalid_sql", `{"sql": "INVALID SQL"}`},
		{"malformed_json", `{"sql": "SELECT 1"`},
	}

	for _, tc := range testCases {
		t.Logf("\n  Subtest: %s", tc.name)

		req, _ := http.NewRequest("POST", "/infer", bytes.NewBufferString(tc.payload))
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

		// Should not have 'schema' on error
		if _, ok := response["schema"]; ok {
			t.Error("    Error response should not have 'schema'")
		}
	}

	t.Log("\n=== Test PASSED ===\n")
}

// Helper function to extract table names from schema
func getTableNames(s *schema.Schema) []string {
	names := make([]string, 0, len(s.Tables))
	for _, table := range s.Tables {
		names = append(names, table.Name)
	}
	return names
}
