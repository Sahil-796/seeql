package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

type Session struct {
	ID        string
	DB        *sql.DB
	Schema    *schema.Schema
	CreatedAt time.Time
	LastUsed  time.Time
}

type SessionManager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	dataDir  string
}

func NewSessionManager(dataDir string) *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*Session),
		dataDir:  dataDir,
	}
}

// creates a new session
func (sm *SessionManager) CreateSession() (*Session, error) {
	
	uuid := uuid.New().String()
	if err := sm.ensureDataDir(); err != nil {
		return nil, err
	}
	dbPath := sm.getDBPath(uuid)
	
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}
	
	session := &Session{
		ID:        uuid,
		DB:        db,
		Schema:    nil,
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.sessions[uuid] = session
	return session, nil
}

// get session by id
func (sm *SessionManager) GetSession(id string) (*Session, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	
	if session, ok := sm.sessions[id]; ok {
		session.LastUsed = time.Now()
		return session, nil
	}
	return nil, fmt.Errorf("session not found: %s", id)
}



// ensureDataDir ensures the data directory exists
func (sm *SessionManager) ensureDataDir() error {
	return os.MkdirAll(sm.dataDir, 0755)
}

// getDBPath returns the file path for a session's database
func (sm *SessionManager) getDBPath(sessionID string) string {
	return filepath.Join(sm.dataDir, sessionID+".db")
}
