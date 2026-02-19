FROM golang:alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server ./apps/api

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
