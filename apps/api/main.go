package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type InferRequest struct {
	SQL string `json:"sql"`
}

type InferResponse struct {
	Message string `json:"message"`
	SQL     string `json:"sql"`
}

func inferHandler(w http.ResponseWriter, r *http.Request) {
	var req InferRequest
	json.NewDecoder(r.Body).Decode(&req)

	resp := InferResponse{
		Message: "Seeql API working",
		SQL:     req.SQL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/infer", inferHandler)

	log.Println("API running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
