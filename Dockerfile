FROM golang:1.25-alpine AS builder
WORKDIR /app

RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy module files first (for caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy backend code
COPY apps/api ./apps/api
COPY internal ./internal

RUN CGO_ENABLED=1 go build -o server ./apps/api


# ---- Runtime stage ----
FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]