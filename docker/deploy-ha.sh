#!/bin/bash
#
# High Availability PSP Deployment Script
# Deploys the entire HA-enabled PSP system with all microservices
#
# Usage: bash deploy-ha.sh [scale-factor]
# Example: bash deploy-ha.sh 2
#          (Starts 2 instances of each service)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose-ha.yml"
SCALE_FACTOR=${1:-2}  # Default to 2 instances per service

echo "=========================================="
echo "PSP High Availability Deployment"
echo "=========================================="
echo ""
echo "Scale Factor: $SCALE_FACTOR instances per service"
echo "Compose File: $COMPOSE_FILE"
echo ""

# Step 1: Verify prerequisites
echo "[1/5] Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed"
    exit 1
fi

echo "âœ“ Docker and Docker Compose are installed"
echo ""

# Step 2: Generate SSL certificates
echo "[2/5] Generating SSL certificates..."
if [ -f "$SCRIPT_DIR/ssl/server.crt" ]; then
    echo "âš  SSL certificates already exist, skipping generation"
else
    bash "$SCRIPT_DIR/generate-certificates.sh"
    echo "âœ“ SSL certificates generated"
fi
echo ""

# Step 3: Build images
echo "[3/5] Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

echo "âœ“ Docker images built successfully"
echo ""

# Step 4: Start infrastructure
echo "[4/5] Starting infrastructure (databases, brokers, load balancer)..."
docker-compose -f "$COMPOSE_FILE" up -d \
    psp-core-db-primary \
    psp-core-db-replica \
    bank-db-primary \
    bank-db-replica \
    psp-card-db-primary \
    psp-card-db-replica \
    paypal-mongo-db \
    crypto-mongo-db \
    rabbitmq \
    nginx-lb

echo "Waiting for infrastructure to be healthy..."
sleep 10

docker-compose -f "$COMPOSE_FILE" ps
echo "âœ“ Infrastructure started successfully"
echo ""

# Step 5: Start microservices with scaling
echo "[5/5] Starting microservices (scale factor: $SCALE_FACTOR)..."
docker-compose -f "$COMPOSE_FILE" up -d \
    --scale core-service=$SCALE_FACTOR \
    --scale bank-service=$SCALE_FACTOR \
    --scale card-service=$SCALE_FACTOR \
    --scale paypal-service=$((SCALE_FACTOR - 1)) \
    --scale crypto-service=1 \
    --scale api-gateway=$SCALE_FACTOR \
    --scale web-shop=1

echo "Waiting for services to be ready..."
sleep 15

echo ""
echo "=========================================="
echo "âœ“ Deployment Complete!"
echo "=========================================="
echo ""
echo "Access Points:"
echo "  - API Gateway: https://localhost/api"
echo "  - Health Check: https://localhost/health"
echo "  - Metrics: https://localhost/metrics"
echo "  - Web Shop: http://localhost/4200"
echo ""
echo "Services Running:"
docker-compose -f "$COMPOSE_FILE" ps --filter status=running | grep -E "(core-|bank-|card-|paypal-|crypto-|api-gateway)" || true
echo ""
echo "Useful Commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f [service-name]"
echo "  - Stop: docker-compose -f $COMPOSE_FILE down"
echo "  - Scale service: docker-compose -f $COMPOSE_FILE up -d --scale core-service=4"
echo "  - Health check: curl -k https://localhost/health"
echo ""
echo "Note: Use curl -k for HTTPS (ignoring self-signed certificate)"
echo ""
