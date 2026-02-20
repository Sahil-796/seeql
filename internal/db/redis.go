package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

func InitRedis(addr, password string) {
	redisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})
}

func GetRedis() *redis.Client {
	return redisClient
}

func GetContext() context.Context {
	return ctx
}

func PingRedis() error {
	if redisClient == nil {
		return fmt.Errorf("redis client not initialized")
	}
	return redisClient.Ping(ctx).Err()
}

func StoreSession(sessionID string, sessionData *Session) error {
	jsonData, err := json.Marshal(sessionData)
	if err != nil {
		return err
	}

	return redisClient.Set(ctx, "session:"+sessionID, jsonData, 24*time.Hour).Err()
}

func GetSessionFromRedis(sessionID string) (*Session, error) {
	data, err := redisClient.Get(ctx, "session:"+sessionID).Result()
	if err != nil {
		return nil, err
	}

	var session Session
	if err := json.Unmarshal([]byte(data), &session); err != nil {
		return nil, err
	}
	session.ID = sessionID
	return &session, nil
}

func DeleteSessionFromRedis(sessionID string) error {
	return redisClient.Del(ctx, "session:"+sessionID).Err()
}
