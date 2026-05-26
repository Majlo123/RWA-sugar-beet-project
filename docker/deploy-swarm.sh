#!/bin/bash
# =============================================================================
# PSP Multi-Host Swarm Deployment Script
# =============================================================================
# This script automates Docker Swarm deployment across 2+ machines.
#
# Prerequisites:
#   - Docker installed on BOTH machines
#   - Ports 2377, 7946, 4789 open between machines (Swarm communication)
#   - Port 443, 80 open on Manager node (for HTTPS/HTTP)
#   - SSH access between machines (or run commands manually)
#
# Usage:
#   ON MANAGER NODE:  bash deploy-swarm.sh init
#   ON WORKER NODE:   bash deploy-swarm.sh join <MANAGER_IP> <TOKEN>
#   ON MANAGER NODE:  bash deploy-swarm.sh deploy
#   ON MANAGER NODE:  bash deploy-swarm.sh status
#   ON MANAGER NODE:  bash deploy-swarm.sh teardown
# =============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STACK_NAME="psp"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose-swarm.yml"
REGISTRY="${REGISTRY:-localhost:5000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✘ $1${NC}"
}

# =============================================================================
# COMMAND: init - Initialize Swarm on Manager Node
# =============================================================================
cmd_init() {
    print_header "Initializing Docker Swarm (Manager Node)"

    # Get the machine's IP address
    MANAGER_IP=${1:-$(hostname -I | awk '{print $1}')}
    echo "Manager IP: $MANAGER_IP"

    # Check if already in a swarm
    if docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        print_warning "This node is already part of a Swarm"
        echo ""
        echo "Worker join token:"
        docker swarm join-token worker -q
        echo ""
        echo "Run this on Worker node:"
        echo "  docker swarm join --token $(docker swarm join-token worker -q) ${MANAGER_IP}:2377"
        return 0
    fi

    # Initialize swarm
    echo "[1/4] Initializing Swarm cluster..."
    docker swarm init --advertise-addr "$MANAGER_IP"
    print_success "Swarm initialized"

    # Get worker join token
    echo ""
    echo "[2/4] Getting worker join token..."
    WORKER_TOKEN=$(docker swarm join-token worker -q)
    print_success "Worker token: $WORKER_TOKEN"

    # Generate SSL certificates
    echo ""
    echo "[3/4] Generating SSL certificates..."
    if [ -f "$SCRIPT_DIR/ssl/server.crt" ]; then
        print_warning "SSL certificates already exist, skipping"
    else
        bash "$SCRIPT_DIR/generate-certificates.sh"
        print_success "SSL certificates generated"
    fi

    # Start a local Docker registry (for pushing images to worker nodes)
    echo ""
    echo "[4/4] Starting local Docker registry..."
    if docker service ls 2>/dev/null | grep -q "registry"; then
        print_warning "Registry already running"
    else
        docker service create --name registry --publish published=5000,target=5000 registry:2 2>/dev/null || true
        print_success "Local registry started at ${MANAGER_IP}:5000"
    fi

    echo ""
    print_header "SWARM INITIALIZED SUCCESSFULLY"
    echo "================================================================"
    echo ""
    echo "  NEXT STEP: Run this command on the WORKER machine (Node 2):"
    echo ""
    echo "    docker swarm join --token ${WORKER_TOKEN} ${MANAGER_IP}:2377"
    echo ""
    echo "  Then come back here and run:"
    echo ""
    echo "    bash deploy-swarm.sh deploy"
    echo ""
    echo "================================================================"
}

# =============================================================================
# COMMAND: join - Join Swarm as Worker Node
# =============================================================================
cmd_join() {
    MANAGER_IP=$1
    TOKEN=$2

    if [ -z "$MANAGER_IP" ] || [ -z "$TOKEN" ]; then
        print_error "Usage: bash deploy-swarm.sh join <MANAGER_IP> <TOKEN>"
        exit 1
    fi

    print_header "Joining Docker Swarm as Worker Node"

    echo "Manager IP: $MANAGER_IP"
    echo "Joining swarm..."

    docker swarm join --token "$TOKEN" "${MANAGER_IP}:2377"

    print_success "Successfully joined the Swarm!"
    echo ""
    echo "This node is now a Worker. The Manager will deploy services here."
}

# =============================================================================
# COMMAND: deploy - Build, Push, and Deploy Stack
# =============================================================================
cmd_deploy() {
    print_header "Deploying PSP Stack to Swarm"

    # Verify we are a manager
    if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        print_error "This node is not part of a Swarm. Run 'bash deploy-swarm.sh init' first."
        exit 1
    fi

    NODE_COUNT=$(docker node ls --format '{{.ID}}' | wc -l)
    echo "Swarm nodes: $NODE_COUNT"

    if [ "$NODE_COUNT" -lt 2 ]; then
        print_warning "Only $NODE_COUNT node(s) in swarm. For multi-host, you need at least 2."
        print_warning "Worker services will run on manager until a worker joins."
        echo ""
        read -p "Continue anyway? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            exit 0
        fi
    fi

    # Step 1: Build Docker images
    echo ""
    echo "[1/3] Building Docker images..."
    echo "  Building core-service..."
    docker build -t ${REGISTRY}/psp-core-service:latest ../psp-services/core-service/
    echo "  Building bank-service..."
    docker build -t ${REGISTRY}/psp-bank-service:latest ../psp-services/bank-service/
    echo "  Building card-service..."
    docker build -t ${REGISTRY}/psp-card-service:latest ../psp-services/card-service/
    echo "  Building paypal-service..."
    docker build -t ${REGISTRY}/psp-paypal-service:latest ../psp-services/paypal-service/
    echo "  Building crypto-service..."
    docker build -t ${REGISTRY}/psp-crypto-service:latest ../psp-services/crypto-service/
    echo "  Building api-gateway..."
    docker build -t ${REGISTRY}/psp-api-gateway:latest ../psp-services/api-gateway/
    echo "  Building web-shop..."
    docker build -t ${REGISTRY}/psp-web-shop:latest ../web-shop/
    print_success "All images built"

    # Step 2: Push to registry (so worker nodes can pull)
    echo ""
    echo "[2/3] Pushing images to registry (${REGISTRY})..."
    docker push ${REGISTRY}/psp-core-service:latest
    docker push ${REGISTRY}/psp-bank-service:latest
    docker push ${REGISTRY}/psp-card-service:latest
    docker push ${REGISTRY}/psp-paypal-service:latest
    docker push ${REGISTRY}/psp-crypto-service:latest
    docker push ${REGISTRY}/psp-api-gateway:latest
    docker push ${REGISTRY}/psp-web-shop:latest
    print_success "All images pushed to registry"

    # Step 3: Deploy stack
    echo ""
    echo "[3/3] Deploying stack..."
    REGISTRY=${REGISTRY} docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"
    print_success "Stack deployed!"

    echo ""
    echo "Waiting 30 seconds for services to start..."
    sleep 30

    cmd_status
}

# =============================================================================
# COMMAND: status - Show Swarm and Stack Status
# =============================================================================
cmd_status() {
    print_header "PSP Swarm Status"

    echo "--- Swarm Nodes ---"
    docker node ls
    echo ""

    echo "--- Stack Services ---"
    docker stack services "$STACK_NAME" 2>/dev/null || echo "Stack not deployed yet."
    echo ""

    echo "--- Service Distribution Across Nodes ---"
    docker stack ps "$STACK_NAME" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}\t{{.Error}}" 2>/dev/null || echo "Stack not deployed yet."
    echo ""

    echo "--- Network Info ---"
    docker network ls | grep -E "overlay|psp"
    echo ""

    # Check HTTPS
    echo "--- HTTPS Check ---"
    if curl -sk https://localhost/health 2>/dev/null | grep -q "healthy"; then
        print_success "HTTPS endpoint is responding (TLS active)"
    else
        print_warning "HTTPS endpoint not responding yet (services may still be starting)"
    fi
}

# =============================================================================
# COMMAND: teardown - Remove entire stack
# =============================================================================
cmd_teardown() {
    print_header "Tearing Down PSP Stack"

    echo "Removing stack..."
    docker stack rm "$STACK_NAME" 2>/dev/null || true
    print_success "Stack removed"

    echo "Waiting for services to stop..."
    sleep 10

    read -p "Also leave the Swarm? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker swarm leave --force 2>/dev/null || true
        print_success "Left the Swarm"
    fi
}

# =============================================================================
# COMMAND: scale - Scale a service
# =============================================================================
cmd_scale() {
    SERVICE=$1
    REPLICAS=$2

    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        print_error "Usage: bash deploy-swarm.sh scale <service-name> <replicas>"
        echo "Example: bash deploy-swarm.sh scale psp_core-service 4"
        exit 1
    fi

    docker service scale "${STACK_NAME}_${SERVICE}=${REPLICAS}"
    print_success "Scaled ${SERVICE} to ${REPLICAS} replicas"
}

# =============================================================================
# MAIN
# =============================================================================
case "${1:-help}" in
    init)
        cmd_init "$2"
        ;;
    join)
        cmd_join "$2" "$3"
        ;;
    deploy)
        cmd_deploy
        ;;
    status)
        cmd_status
        ;;
    teardown)
        cmd_teardown
        ;;
    scale)
        cmd_scale "$2" "$3"
        ;;
    *)
        echo "PSP Multi-Host Swarm Deployment"
        echo ""
        echo "Usage: bash deploy-swarm.sh <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init [IP]              Initialize Swarm on this machine (Manager)"
        echo "  join <IP> <TOKEN>      Join an existing Swarm as Worker"
        echo "  deploy                 Build, push images, and deploy stack"
        echo "  status                 Show Swarm and stack status"
        echo "  scale <svc> <n>        Scale a service to n replicas"
        echo "  teardown               Remove the stack and optionally leave Swarm"
        echo ""
        echo "Multi-Host Setup (2 machines):"
        echo "  Machine 1 (Manager):   bash deploy-swarm.sh init"
        echo "  Machine 2 (Worker):    bash deploy-swarm.sh join <MANAGER_IP> <TOKEN>"
        echo "  Machine 1 (Manager):   bash deploy-swarm.sh deploy"
        ;;
esac
