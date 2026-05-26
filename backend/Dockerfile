# --- Stage 1: Build ---
FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git build-base

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# --- Stage 2: Runtime ---
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S beet && adduser -S beet -G beet && \
    mkdir -p /app/uploads && chown -R beet:beet /app

COPY --from=builder /app/server /app/server
COPY --from=builder /app/treasury_abi.json /app/treasury_abi.json
COPY --from=builder /app/docs /app/docs

USER beet

EXPOSE 5000

ENTRYPOINT ["/app/server"]
