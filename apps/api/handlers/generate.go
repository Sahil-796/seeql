package handlers

import (
	"net/http"

	"github.com/Sahil-796/seeql/internal/generator"
	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/gin-gonic/gin"
)

type GenerateRequest struct {
	SQL          string `json:"sql"`
	RowsPerTable int    `json:"rows_per_table"`
}

type GenerateResponse struct {
	Data  map[string][]map[string]any `json:"data,omitempty"`
	Error string                      `json:"error,omitempty"`
}

func GenerateData(c *gin.Context) {
	var req GenerateRequest

	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, GenerateResponse{Error: err.Error()})
		return
	}

	if req.RowsPerTable <= 0 {
		req.RowsPerTable = 10
	}

	s, err := schema.BuildSchema(req.SQL)
	if err != nil {
		c.JSON(http.StatusBadRequest, GenerateResponse{Error: err.Error()})
		return
	}

	gen := generator.New(s)
	data := gen.GenerateData(req.RowsPerTable)

	c.JSON(http.StatusOK, GenerateResponse{Data: data})
}
