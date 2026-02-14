package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

type Session struct {
	ID        string
	DB        *sql.DB
	Schema    *schema.Schema
	CreatedAt int64 `json:"created_at"`
	LastUsed  int64 `json:"last_used"`
}

type SessionManager struct {
	dataDir string
}

func NewSessionManager(dataDir string) *SessionManager {
	return &SessionManager{
		dataDir: dataDir,
	}
}

// creates a new session and stores in Redis
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

	session := &Session{
		ID:        sessionID,
		DB:        db,
		Schema:    &schema.Schema{Tables: []schema.TableSchema{}},
		CreatedAt: timeNow(),
		LastUsed:  timeNow(),
	}

	// Store session metadata in Redis
	if err := StoreSession(sessionID, session); err != nil {
		db.Close()
		os.Remove(dbPath)
		return nil, fmt.Errorf("failed to store session in Redis: %w", err)
	}

	return session, nil
}

// get session by id - retrieves from Redis, recreates DB connection
func (sm *SessionManager) GetSession(id string) (*Session, error) {
	// Get session metadata from Redis
	session, err := GetSessionFromRedis(id)
	if err != nil {
		return nil, fmt.Errorf("session not found: %s", id)
	}

	// Recreate SQLite connection
	dbPath := sm.getDBPath(id)
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	session.DB = db
	session.LastUsed = timeNow()

	// Update last used time in Redis
	StoreSession(id, session)

	return session, nil
}

func (sm *SessionManager) CloseSession(id string) error {
	// Get session to close DB connection
	session, err := sm.GetSession(id)
	if err != nil {
		return err
	}

	if session.DB != nil {
		session.DB.Close()
	}

	// Clean up SQLite file
	dbPath := sm.getDBPath(id)
	os.Remove(dbPath)

	// Remove from Redis
	if err := DeleteSessionFromRedis(id); err != nil {
		return fmt.Errorf("failed to delete session from Redis: %w", err)
	}

	return nil
}

// UpdateSession saves session metadata to Redis after schema changes
func (sm *SessionManager) UpdateSession(session *Session) error {
	session.LastUsed = timeNow()
	return StoreSession(session.ID, session)
}

func (sm *SessionManager) ensureDataDir() error {
	return os.MkdirAll(sm.dataDir, 0755)
}

// file path
func (sm *SessionManager) getDBPath(sessionID string) string {
	return filepath.Join(sm.dataDir, sessionID+".db")
}

func timeNow() int64 {
	return time.Now().Unix()
}
