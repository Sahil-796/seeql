package parser

import "vitess.io/vitess/go/vt/sqlparser"

func Parse(sql string) (sqlparser.Statement, error) {
	p, err := sqlparser.New(sqlparser.Options{})
	if err != nil {
		return nil, err
	}
	stmt, _, err := p.Parse2(sql)
	return stmt, err
}
