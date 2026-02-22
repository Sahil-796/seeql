package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

const (
	MaxSessions     = 100
	SessionTTL      = 1 * time.Hour
	CleanupInterval = 5 * time.Minute
)

type Session struct {
	ID        string         `json:"-"`
	DB        *sql.DB        `json:"-"`
	Mu        sync.RWMutex   `json:"-"`
	Schema    *schema.Schema `json:"schema"`
	CreatedAt time.Time      `json:"created_at"`
	LastUsed  time.Time      `json:"last_used"`
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

func NewSession(id string, db *sql.DB) *Session {
	return &Session{
		ID:        id,
		DB:        db,
		Schema:    &schema.Schema{Tables: []schema.TableSchema{}},
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}
}

// creates a new session and stores in memory
func (sm *SessionManager) CreateSession() (*Session, error) {
	sm.mu.RLock()
	count := len(sm.sessions)
	sm.mu.RUnlock()

	if count >= MaxSessions {
		return nil, fmt.Errorf("maximum session limit reached (%d)", MaxSessions)
	}

	sessionID := uuid.New().String()
	if err := sm.ensureDataDir(); err != nil {
		return nil, err
	}
	dbPath := sm.getDBPath(sessionID)

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := ConfigureSQLite(db); err != nil {
		db.Close()
		os.Remove(dbPath)
		return nil, fmt.Errorf("failed to configure database: %w", err)
	}

	session := NewSession(sessionID, db)

	sm.mu.Lock()
	sm.sessions[sessionID] = session
	sm.mu.Unlock()

	return session, nil
}

// get session by id from memory
func (sm *SessionManager) GetSession(id string) (*Session, error) {
	sm.mu.RLock()
	session, exists := sm.sessions[id]
	sm.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("session not found: %s", id)
	}

	session.Mu.Lock()
	session.LastUsed = time.Now()
	session.Mu.Unlock()
	return session, nil
}

func (sm *SessionManager) CloseSession(id string) error {
	sm.mu.Lock()
	session, exists := sm.sessions[id]
	if !exists {
		sm.mu.Unlock()
		return fmt.Errorf("session not found: %s", id)
	}
	delete(sm.sessions, id)
	sm.mu.Unlock()

	if session.DB != nil {
		session.DB.Close()
	}

	dbPath := sm.getDBPath(id)
	os.Remove(dbPath)

	return nil
}

// UpdateSession updates last used time
func (sm *SessionManager) UpdateSession(session *Session) error {
	session.Mu.Lock()
	session.LastUsed = time.Now()
	session.Mu.Unlock()
	return nil
}

func (sm *SessionManager) ensureDataDir() error {
	return os.MkdirAll(sm.dataDir, 0755)
}

// StartCleanup runs a background goroutine that expires idle sessions
func (sm *SessionManager) StartCleanup() {
	ticker := time.NewTicker(CleanupInterval)
	go func() {
		for range ticker.C {
			sm.expireSessions()
		}
	}()
}

func (sm *SessionManager) expireSessions() {
	now := time.Now()
	var expired []string

	sm.mu.RLock()
	for id, session := range sm.sessions {
		session.Mu.RLock()
		if now.Sub(session.LastUsed) > SessionTTL {
			expired = append(expired, id)
		}
		session.Mu.RUnlock()
	}
	sm.mu.RUnlock()

	for _, id := range expired {
		sm.CloseSession(id)
		fmt.Printf("Expired idle session: %s\n", id)
	}
}

func (sm *SessionManager) getDBPath(sessionID string) string {
	return filepath.Join(sm.dataDir, sessionID+".db")
}

func (sm *SessionManager) CleanupOrphanedDBs() error {
	entries, err := os.ReadDir(sm.dataDir)
	if err != nil {
		return fmt.Errorf("failed to read data directory: %w", err)
	}

	sm.mu.RLock()
	defer sm.mu.RUnlock()

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".db") {
			continue
		}

		sessionID := strings.TrimSuffix(entry.Name(), ".db")

		if _, exists := sm.sessions[sessionID]; !exists {
			dbPath := sm.getDBPath(sessionID)
			if removeErr := os.Remove(dbPath); removeErr != nil {
				fmt.Printf("Failed to remove orphaned DB %s: %v\n", sessionID, removeErr)
			} else {
				fmt.Printf("Cleaned up orphaned DB: %s\n", sessionID)
			}
		}
	}

	return nil
}
