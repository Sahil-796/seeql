package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/modes"
	"github.com/gin-gonic/gin"
)

type RunRequest struct {
	SQL string `json:"sql" binding:"required"`
}

func QuickRun(c *gin.Context) {
	var req RunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !db.IsSingleStatement(req.SQL) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "multiple statements are not allowed in quick-run mode"})
		return
	}

	statements := splitStatements(req.SQL)

	mode, err := modes.NewMode(modes.ModeQuick, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer mode.Close()

	// Execute all statements, return result of last one
	var lastResult *modes.QueryResult
	for _, stmt := range statements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)

		result, err := mode.Run(ctx, stmt)
		cancel()

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		lastResult = result
	}

	c.JSON(http.StatusOK, lastResult)
}

// splitStatements splits SQL by semicolons, respecting quoted strings
func splitStatements(sql string) []string {
	var statements []string
	var current strings.Builder
	inString := false
	stringChar := rune(0)

	for _, ch := range sql {
		if !inString && (ch == '\'' || ch == '"') {
			inString = true
			stringChar = ch
		} else if inString && ch == stringChar {
			inString = false
		} else if !inString && ch == ';' {
			statements = append(statements, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(ch)
	}

	// Add final statement
	if current.Len() > 0 {
		statements = append(statements, current.String())
	}

	return statements
}
