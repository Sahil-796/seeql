package main

import (
	"fmt"
	"net/http"

	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/gin-gonic/gin"
)

type InferRequest struct {
	SQL string `json:"sql"`
}

type InferResponse struct {
	Schema *schema.Schema `json:"schema,omitempty"`
	Error string `json:"error,omitempty"`
}

func inferHandler(schema *schema.Schema) {
	
}

func main() {
	
	r := gin.Default()
	
	r.POST("/infer", func(c *gin.Context) {
		var req InferRequest
		
		if err := c.ShouldBind(&req); err != nil {
			fmt.Printf("Error binding request: %v\n", err)
			c.JSON(http.StatusBadRequest, InferResponse{Error: err.Error()})
			return
		}
		
		stmt, err := parser.Parse(req.SQL)
		
		if err != nil {
			c.JSON(http.StatusBadRequest, InferResponse{Error: err.Error()})
			return
		}
		
		inferredSchema, err := schema.BuildSchema(stmt)
		
		if err != nil {
			c.JSON(http.StatusBadRequest, InferResponse{Error: err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, InferResponse{Schema: inferredSchema})
	})
	
	r.Run(":8080")
}
