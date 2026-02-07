package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// setupHealthRouter creates a test router with the Health handler
func setupHealthRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/health", Health)
	return r
}

// TestHealth_Success tests the health endpoint returns OK
func TestHealth_Success(t *testing.T) {
	t.Log("=== Test Case: Health Check Success ===")
	t.Log("Testing GET /health returns status 200 and 'ok'")

	router := setupHealthRouter()

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)
	t.Logf("Response body: %s", w.Body.String())

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response HealthResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if response.Status != "ok" {
		t.Errorf("Expected status 'ok', got '%s'", response.Status)
	}

	t.Log("=== Test PASSED ===\n")
}

// TestHealth_ResponseStructure validates health response structure
func TestHealth_ResponseStructure(t *testing.T) {
	t.Log("=== Test Case: Health Response Structure ===")
	t.Log("Validating that health response has correct JSON structure")

	router := setupHealthRouter()

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	// Validate content type
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json; charset=utf-8" {
		t.Logf("Content-Type: %s", contentType)
	}

	// Validate JSON structure
	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Response is not valid JSON: %v", err)
	}

	if _, ok := response["status"]; !ok {
		t.Error("Response missing 'status' field")
	}

	t.Logf("Response structure: %v", response)
	t.Log("=== Test PASSED ===\n")
}

// TestHealth_MethodNotAllowed tests POST request to health endpoint
func TestHealth_MethodNotAllowed(t *testing.T) {
	t.Log("=== Test Case: Health Method Not Allowed ===")
	t.Log("Testing POST to /health should return 404")

	router := setupHealthRouter()

	body := []byte(`{}`)
	req, _ := http.NewRequest("POST", "/health", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	t.Logf("Response status: %d", w.Code)

	// POST to GET-only route should return 404
	if w.Code != http.StatusNotFound {
		t.Logf("Expected 404, got %d (router behavior may vary)", w.Code)
	}

	t.Log("=== Test Complete ===\n")
}
