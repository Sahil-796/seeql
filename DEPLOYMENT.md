# Deployment Guide: Azure Container Apps + Redis

This guide covers deploying Seeql to **Azure Container Apps** with **Azure Cache for Redis** for session persistence in serverless containers.

## Why This Stack?

| Component | Purpose | Cost (with GitHub Student) |
|-----------|---------|---------------------------|
| **Azure Container Apps** | Serverless container hosting | $0 (with $100 credit) |
| **Azure Cache for Redis** | Session persistence | $0 (free tier: 250MB) |
| **Namecheap** | Custom domain | $0 (free .me domain via GitHub Student) |
| **Cloudflare** | DDoS + CDN + SSL | $0 (free tier) |

**Total: $0 for 10-20 months with GitHub Student Pack**

---

## The Problem with Serverless Containers

**Without Redis:**
```
Container Restart
    ↓
Sessions map (RAM) → LOST ❌
*sql.DB connections → LOST ❌
SQLite files (disk) → PERSIST ✅
```

**With Redis:**
```
Container Restart
    ↓
Redis: "Session abc-123 exists with schema {...}"
    ↓
Rebuild: Open SQLite file + Parse schema JSON → WORKS ✅
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Request                          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Azure Container Apps                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Seeql Container                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │   │
│  │  │ HTTP Handler │→ │ Playground   │→│ SQLite   │  │   │
│  │  │              │  │ Mode         │  │ File     │  │   │
│  │  └──────────────┘  └──────┬───────┘  └──────────┘  │   │
│  │                           │                        │   │
│  │                    ┌──────▼───────┐                │   │
│  │                    │ Redis Client │                │   │
│  │                    └──────┬───────┘                │   │
│  └───────────────────────────┼────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Azure Cache for    │
                    │  Redis (250MB free) │
                    └─────────────────────┘
```

---

## Prerequisites

1. **Azure Account** with GitHub Student Pack ($100 credit)
2. **GitHub Student Pack** (free domain + Azure credits)
3. **Docker** installed locally
4. **Azure CLI** installed: `brew install azure-cli`

---

## Step 1: Prepare Your Code for Redis

### 1.1 Add Redis Dependency

```bash
go get github.com/redis/go-redis/v9
```

### 1.2 Update SessionManager

Replace `internal/db/session.go` with Redis support:

```go
package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/Sahil-796/seeql/internal/schema"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	_ "github.com/mattn/go-sqlite3"
)

type Session struct {
	ID        string         `json:"id"`
	Schema    *schema.Schema `json:"schema"`
	CreatedAt time.Time      `json:"created_at"`
	LastUsed  time.Time      `json:"last_used"`
	// Note: DB is not stored - recreated on retrieval
}

type SessionManager struct {
	redis   *redis.Client
	dataDir string
}

func NewSessionManager(redisURL, dataDir string) *SessionManager {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		panic(fmt.Sprintf("Invalid Redis URL: %v", err))
	}

	return &SessionManager{
		redis:   redis.NewClient(opts),
		dataDir: dataDir,
	}
}

func (sm *SessionManager) CreateSession(ctx context.Context) (*Session, error) {
	sessionID := uuid.New().String()

	if err := sm.ensureDataDir(); err != nil {
		return nil, err
	}

	dbPath := sm.getDBPath(sessionID)

	// Create empty SQLite file
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}
	db.Close()

	session := &Session{
		ID:        sessionID,
		Schema:    &schema.Schema{Tables: []schema.TableSchema{}},
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}

	// Store in Redis
	sessionJSON, _ := json.Marshal(session)
	err = sm.redis.Set(ctx, "session:"+sessionID, sessionJSON, 24*time.Hour).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to store session in Redis: %w", err)
	}

	return session, nil
}

func (sm *SessionManager) GetSession(ctx context.Context, id string) (*Session, *sql.DB, error) {
	// Get session metadata from Redis
	sessionJSON, err := sm.redis.Get(ctx, "session:"+id).Result()
	if err == redis.Nil {
		return nil, nil, fmt.Errorf("session not found: %s", id)
	} else if err != nil {
		return nil, nil, fmt.Errorf("redis error: %w", err)
	}

	var session Session
	if err := json.Unmarshal([]byte(sessionJSON), &session); err != nil {
		return nil, nil, fmt.Errorf("failed to parse session: %w", err)
	}

	// Open SQLite connection (recreate)
	dbPath := sm.getDBPath(id)
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Update last used
	session.LastUsed = time.Now()
	sessionJSON, _ = json.Marshal(session)
	sm.redis.Set(ctx, "session:"+id, sessionJSON, 24*time.Hour)

	return &session, db, nil
}

func (sm *SessionManager) UpdateSession(ctx context.Context, session *Session) error {
	session.LastUsed = time.Now()
	sessionJSON, _ := json.Marshal(session)
	return sm.redis.Set(ctx, "session:"+session.ID, sessionJSON, 24*time.Hour).Err()
}

func (sm *SessionManager) CloseSession(ctx context.Context, id string) error {
	// Remove from Redis
	sm.redis.Del(ctx, "session:"+id)

	// Clean up SQLite file
	dbPath := sm.getDBPath(id)
	os.Remove(dbPath)

	return nil
}

func (sm *SessionManager) ensureDataDir() error {
	return os.MkdirAll(sm.dataDir, 0755)
}

func (sm *SessionManager) getDBPath(sessionID string) string {
	return filepath.Join(sm.dataDir, sessionID+".db")
}
```

### 1.3 Update PlaygroundMode

Modify `internal/modes/playground.go` to work with Redis:

```go
// In handleCreateTable:
// After updating schema, save to Redis:
err = sm.UpdateSession(ctx, session)
```

---

## Step 2: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o seeql-server ./apps/api

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install SQLite
RUN apk add --no-cache sqlite

# Create data directory for sessions
RUN mkdir -p /app/data/sessions

# Copy binary from builder
COPY --from=builder /app/seeql-server .

# Expose port
EXPOSE 8080

# Run the server
CMD ["./seeql-server"]
```

Add `.dockerignore`:

```
*.db
.git
.env
```

---

## Step 3: Deploy to Azure

### 3.1 Login to Azure

```bash
az login
```

### 3.2 Create Resource Group

```bash
az group create \
  --name seeql-rg \
  --location eastus
```

### 3.3 Create Redis Cache (Free Tier)

```bash
az redis create \
  --name seeql-redis \
  --resource-group seeql-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

**Note:** Free tier = 250MB, Basic SKU, C0 size

Get the Redis connection string:

```bash
az redis list-keys \
  --name seeql-redis \
  --resource-group seeql-rg
```

Connection string format:
```
redis://:<primary-key>@seeql-redis.redis.cache.windows.net:6379
```

### 3.4 Create Container Registry (ACR)

```bash
az acr create \
  --name seeqlregistry \
  --resource-group seeql-rg \
  --sku Basic \
  --admin-enabled true
```

Login to ACR:

```bash
az acr login --name seeqlregistry
```

### 3.5 Build and Push Docker Image

```bash
# Build
docker build -t seeqlregistry.azurecr.io/seeql:latest .

# Push
docker push seeqlregistry.azurecr.io/seeql:latest
```

### 3.6 Create Container Apps Environment

```bash
az containerapp env create \
  --name seeql-env \
  --resource-group seeql-rg \
  --location eastus
```

### 3.7 Deploy Container App

```bash
az containerapp create \
  --name seeql-app \
  --resource-group seeql-rg \
  --environment seeql-env \
  --image seeqlregistry.azurecr.io/seeql:latest \
  --target-port 8080 \
  --ingress external \
  --env-vars REDIS_URL=<your-redis-connection-string> \
  --min-replicas 1 \
  --max-replicas 1
```

Get the app URL:

```bash
az containerapp show \
  --name seeql-app \
  --resource-group seeql-rg \
  --query properties.configuration.ingress.fqdn
```

---

## Step 4: Add Persistent Storage for SQLite

**Problem:** Container restarts lose SQLite files

**Solution:** Mount Azure Files storage

### 4.1 Create Storage Account

```bash
az storage account create \
  --name seeqlstorage \
  --resource-group seeql-rg \
  --location eastus \
  --sku Standard_LRS
```

### 4.2 Create File Share

```bash
az storage share create \
  --name sessions \
  --account-name seeqlstorage
```

### 4.3 Get Storage Key

```bash
az storage account keys list \
  --account-name seeqlstorage \
  --resource-group seeql-rg \
  --query '[0].value'
```

### 4.4 Update Container App with Storage

```bash
# Add storage to environment
az containerapp env storage set \
  --name seeql-env \
  --resource-group seeql-rg \
  --storage-name sessionstorage \
  --azure-file-account-name seeqlstorage \
  --azure-file-share-name sessions \
  --azure-file-account-key <storage-key> \
  --access-mode ReadWrite

# Update app to mount storage
az containerapp update \
  --name seeql-app \
  --resource-group seeql-rg \
  --container-name seeql-app \
  --set containers[0].volumeMounts=[{name:sessions-vol,mountPath:/app/data/sessions}]
```

---

## Step 5: Custom Domain + Cloudflare

### 5.1 Get Free Domain from Namecheap (GitHub Student)

1. Go to GitHub Student Pack → Namecheap
2. Claim free .me domain
3. Point nameservers to Cloudflare

### 5.2 Setup Cloudflare

1. Add site to Cloudflare
2. Change nameservers at Namecheap
3. Add DNS record:
   - Type: CNAME
   - Name: api
   - Target: <your-azure-app-url>

### 5.3 Configure Azure Custom Domain

```bash
az containerapp hostname add \
  --name seeql-app \
  --resource-group seeql-rg \
  --hostname api.yourdomain.me
```

### 5.4 Enable HTTPS

In Cloudflare:
- SSL/TLS → Full (strict)
- Always Use HTTPS: ON

---

## Step 6: Environment Variables

Create `apps/api/.env` (don't commit to git):

```
REDIS_URL=redis://:<password>@<host>:6379
DATA_DIR=/app/data/sessions
PORT=8080
```

---

## Testing Your Deployment

```bash
# Test health
curl https://api.yourdomain.me/health

# Test QuickMode
curl -X POST https://api.yourdomain.me/quick-run \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'

# Test PlaygroundMode
SESSION=$(curl -X POST https://api.yourdomain.me/playground/session | jq -r '.session_id')

curl -X POST https://api.yourdomain.me/playground/session/$SESSION/execute \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE TABLE test (id INT)"}'
```

---

## Monitoring & Logs

```bash
# View logs
az containerapp logs show \
  --name seeql-app \
  --resource-group seeql-rg \
  --follow

# View metrics in Azure Portal
# Container Apps → seeql-app → Monitoring
```

---

## Cost Breakdown (After Free Credits)

| Service | Monthly Cost |
|---------|-------------|
| Azure Container Apps | ~$5-10 (depending on usage) |
| Azure Cache for Redis (Basic C0) | ~$15 |
| Azure Storage | ~$1 |
| **Total** | **~$20-25/month** |

**With $100 GitHub Student credit:** 4-5 months free

---

## Troubleshooting

### Issue: Session not found after restart
**Solution:** Ensure Redis is working and session is being stored

### Issue: SQLite files not persisting
**Solution:** Check Azure Files mount is configured correctly

### Issue: Container won't start
**Solution:** Check logs: `az containerapp logs show --name seeql-app --resource-group seeql-rg`

---

## Summary

You now have:
- ✅ Serverless container hosting (Azure)
- ✅ Session persistence across restarts (Redis)
- ✅ SQLite file persistence (Azure Files)
- ✅ Custom domain (Namecheap + Cloudflare)
- ✅ HTTPS + DDoS protection (Cloudflare)
- ✅ ~$0 cost for 4-5 months

**Your app survives container restarts and scales automatically!**
