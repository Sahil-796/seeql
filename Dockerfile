FROM golang:1.21-alpine AS builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./apps/api
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache sqlite
RUN mkdir -p /app/data/sessions
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]