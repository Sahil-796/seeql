package modes

import (
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/schema"
)

type ExecutionMode interface {
	Run(query string) (*QueryResult, error)
	GetSchema() (*schema.Schema, error)
	Close() error
}

type QueryResult struct {
	Columns  []string         `json:"columns"`
	Rows     []map[string]any `json:"rows"`
	RowCount int              `json:"row_count"`
	Schema   *schema.Schema   `json:"schema,omitempty"`
}

const (
	ModeQuick      string = "quick"
	ModePlayground string = "playground"
)

func NewMode(mode string, session *db.Session) (ExecutionMode, error) {
	switch mode {
	case ModeQuick:
		return NewQuickMode(), nil
	case ModePlayground:
		return NewPlaygroundMode(session), nil
	default:
		return NewQuickMode(), nil
	}
}
