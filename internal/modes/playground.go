package modes

import (
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/parser"
	"github.com/Sahil-796/seeql/internal/schema"
)

type PlaygroundMode struct {
	session *db.Session
}

func NewPlaygroundMode(session *db.Session) *PlaygroundMode {
	return &PlaygroundMode{
		session: session,
	}
}

func (p *PlaygroundMode) Run(query string) (*QueryResult, error) {
	
	stmt, err := parser.Parse(query)
	if err != nil { return nil, err }
	
	switch stmt := parsedStmt.(type) {
		case *sqlparser.CreatedTable:
		return p.handleCreateTable(stmt, query)
	}
	
	
}

func (p *PlaygroundMode) GetSchema() (*schema.Schema, error) {
	return p.session.Schema, nil
}

func (p *PlaygroundMode) Close() error {
	return p.session.DB.Close()
}


// Implement `Run(query string)` step by step:**

// ```go
// func (p *PlaygroundMode) Run(query string) (*QueryResult, error) {
//     // 1. Parse the SQL
//     parsedStmt, err := parser.Parse(query)
//     if err != nil { return nil, err }
    
//     // 2. Type switch on statement
//     switch stmt := parsedStmt.(type) {
//     case *sqlparser.CreateTable:
//         return p.handleCreateTable(stmt, query)
//     case *sqlparser.Select:
//         return p.handleSelect(query)
//     case *sqlparser.Insert:
//         return p.handleInsert(query)
//     // ... etc
//     default:
//         return p.executeRaw(query)
//     }
// }
// ```

// **For each handler:**

// **CREATE TABLE:**
// ```go
// func (p *PlaygroundMode) handleCreateTable(stmt *sqlparser.CreateTable, raw string) (*QueryResult, error) {
//     // Extract schema from DDL
//     // Create table in DB using db.CreateTable()
//     // Add to p.session.Schema.Tables
//     // Return success message
// }
// ```

// **SELECT:**
// ```go
// func (p *PlaygroundMode) handleSelect(query string) (*QueryResult, error) {
//     // Use db.ExecuteQuery() 
//     // Return QueryResult with rows
// }
// ```

// **INSERT/UPDATE/DELETE:**
// ```go
// func (p *PlaygroundMode) handleInsert(query string) (*QueryResult, error) {
//     // Use p.session.DB.Exec(query)
//     // Get RowsAffected(), LastInsertId()
//     // Return appropriate QueryResult
// }
// ```

// **Key points:**
// - Import `"vitess.io/vitess/go/vt/sqlparser"` for type assertions
// - Import `"github.com/Sahil-796/seeql/internal/parser"` for Parse()
// - `db.CreateTable()` takes `*schema.TableSchema`
// - `parser.ExtractSchemaFromDDL()` converts `*sqlparser.CreateTable` to `*parser.ParsedDDL`

// Need more details on any specific part?