package db

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func ExecuteQuery(db  *sql.DB, query string) {
	
}