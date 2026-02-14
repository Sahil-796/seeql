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
)

type Session struct {
	ID        string
	DB        *sql.DB
	Schema    *schema.Schema
	CreatedAt time.Time
	LastUsed  time.Time
}

func NewSession(id string, db *sql.DB) *Session {
	return &Session{
		ID:        id,
		DB:        db,
		Schema:    &schema.Schema{Tables: []schema.TableSchema{}}, // NEVER nil!
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}
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
	sessionID := uuid.New().String()
	if err := sm.ensureDataDir(); err != nil {
		return nil, err
	}
	dbPath := sm.getDBPath(sessionID)

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	session := NewSession(sessionID, db)

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.sessions[sessionID] = session
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

func (sm *SessionManager) CloseSession(id string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	session, err := sm.GetSession(id)

	if err != nil {
		return err
	}

	session.DB.Close()
	// close session also cleans up the db path
	os.Remove(sm.getDBPath(id))

	delete(sm.sessions, id)
	return nil
}

func (sm *SessionManager) CleanupOldSessions(maxAge time.Duration) int {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	var count int
	for id, session := range sm.sessions {
		age := session.LastUsed.Sub(session.CreatedAt)
		// crazy other option -> session.CreatedAt.Add(-session.LastUsed)
		if age > maxAge {
			sm.CloseSession(id)
			count++
		}
	}
	return count
}

func (sm *SessionManager) ensureDataDir() error {
	return os.MkdirAll(sm.dataDir, 0755)
}

// file path
func (sm *SessionManager) getDBPath(sessionID string) string {
	return filepath.Join(sm.dataDir, sessionID+".db")
}
