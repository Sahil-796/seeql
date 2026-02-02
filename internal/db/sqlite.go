package db


import (
	"database/sql"
	"github.com/mattn/go-sqlite3"
)

func init() {
	sql.Open("sqlite3", ":memory:")
	sql.Register("sqlite3", &sqlite3.SQLiteDriver{})

}
