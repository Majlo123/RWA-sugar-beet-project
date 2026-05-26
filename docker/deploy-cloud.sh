#!/bin/bash
# =============================================================================
# PSP CLOUD DEPLOYMENT SCRIPT - Docker Swarm (2+ Nodes)
# =============================================================================
# Ova skripta automatizuje deploy PSP sistema na cloud (Play with Docker,
# AWS, DigitalOcean, ili bilo koja 2 racunara sa Docker-om).
#
# Koriscenje:
#   NA MANAGER NODU:  bash deploy-cloud.sh init
#   NA WORKER NODU:   bash deploy-cloud.sh join <MANAGER_IP> <TOKEN>
#   NA MANAGER NODU:  bash deploy-cloud.sh deploy
#   NA MANAGER NODU:  bash deploy-cloud.sh status
#   NA MANAGER NODU:  bash deploy-cloud.sh test
#   NA MANAGER NODU:  bash deploy-cloud.sh teardown
#
# Preduslovi:
#   - Docker instaliran na OBA racunara
#   - Portovi 2377, 7946, 4789 otvoreni izmedju racunara (Swarm)
#   - Portovi 443, 80 otvoreni na Manager nodu (HTTPS/HTTP)
#   - Port 5000 otvoren na Manager nodu (Docker Registry)
# =============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STACK_NAME="psp"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose-swarm.yml"
REGISTRY="${REGISTRY:-localhost:5000}"

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

ok()   { echo -e "${GREEN}[OK] $1${NC}"; }
warn() { echo -e "${YELLOW}[!]  $1${NC}"; }
err()  { echo -e "${RED}[X]  $1${NC}"; }
info() { echo -e "${CYAN}[i]  $1${NC}"; }

# =============================================================================
# INIT - Inicijalizacija Swarm-a na Manager nodu
# =============================================================================
cmd_init() {
    print_header "KORAK 1: Inicijalizacija Docker Swarm (Manager Node)"

    MANAGER_IP=${1:-$(hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 | awk '{print $7;exit}')}
    echo "Manager IP: $MANAGER_IP"

    # Proveri da li je vec u Swarm-u
    if docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        warn "Ovaj nod je vec deo Swarm-a"
        WORKER_TOKEN=$(docker swarm join-token worker -q)
        echo ""
        echo -e "${CYAN}Na WORKER nodu pokreni:${NC}"
        echo -e "${GREEN}  docker swarm join --token ${WORKER_TOKEN} ${MANAGER_IP}:2377${NC}"
        return 0
    fi

    # [1/4] Inicijalizuj Swarm
    echo "[1/4] Inicijalizacija Swarm klastera..."
    docker swarm init --advertise-addr "$MANAGER_IP" || docker swarm init
    ok "Swarm inicijalizovan"

    # [2/4] Token za Worker
    echo ""
    echo "[2/4] Generisanje Worker join tokena..."
    WORKER_TOKEN=$(docker swarm join-token worker -q)
    ok "Worker token: $WORKER_TOKEN"

    # [3/4] SSL sertifikati
    echo ""
    echo "[3/4] Generisanje SSL sertifikata za HTTPS..."
    mkdir -p "$SCRIPT_DIR/ssl"
    if [ -f "$SCRIPT_DIR/ssl/server.crt" ]; then
        warn "SSL sertifikati vec postoje, preskacemo"
    else
        # Generisanje self-signed certifikata direktno (bez external skripte)
        openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
            -keyout "$SCRIPT_DIR/ssl/server.key" \
            -out "$SCRIPT_DIR/ssl/server.crt" \
            -subj "/C=RS/ST=Serbia/L=Belgrade/O=PSP/CN=localhost" \
            -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:$MANAGER_IP" 2>/dev/null \
        || openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SCRIPT_DIR/ssl/server.key" \
            -out "$SCRIPT_DIR/ssl/server.crt" \
            -subj "/C=RS/ST=Serbia/L=Belgrade/O=PSP/CN=localhost"
        chmod 600 "$SCRIPT_DIR/ssl/server.key"
        chmod 644 "$SCRIPT_DIR/ssl/server.crt"
        ok "SSL sertifikati generisani (TLS 1.2+)"
    fi

    # [4/4] Lokalni Docker Registry
    echo ""
    echo "[4/4] Pokretanje lokalnog Docker Registry-ja..."
    if docker service ls 2>/dev/null | grep -q "registry"; then
        warn "Registry vec radi"
    else
        docker service create --name registry --publish published=5000,target=5000 registry:2 2>/dev/null || true
        ok "Lokalni registry pokrenut na ${MANAGER_IP}:5000"
    fi

    echo ""
    print_header "SWARM INICIJALIZOVAN USPESNO"
    echo "================================================================"
    echo ""
    echo -e "  ${YELLOW}SLEDECI KORAK: Pokreni ovo na WORKER masini (Racunar 2):${NC}"
    echo ""
    echo -e "    ${CYAN}docker swarm join --token ${WORKER_TOKEN} ${MANAGER_IP}:2377${NC}"
    echo ""
    echo -e "  ${YELLOW}Zatim se vrati ovde i pokreni:${NC}"
    echo ""
    echo -e "    ${CYAN}bash deploy-cloud.sh deploy${NC}"
    echo ""
    echo "================================================================"
}

# =============================================================================
# JOIN - Prikljucivanje Swarm-u kao Worker Node
# =============================================================================
cmd_join() {
    MANAGER_IP=$1
    TOKEN=$2

    if [ -z "$MANAGER_IP" ] || [ -z "$TOKEN" ]; then
        err "Koriscenje: bash deploy-cloud.sh join <MANAGER_IP> <TOKEN>"
        exit 1
    fi

    print_header "KORAK 2: Prikljucivanje Swarm-u (Worker Node)"
    echo "Manager IP: $MANAGER_IP"

    docker swarm join --token "$TOKEN" "${MANAGER_IP}:2377"

    ok "Uspesno prikljucen Swarm-u!"
    echo ""
    info "Ovaj nod je sada Worker. Manager ce rasporediti servise ovde."
}

# =============================================================================
# DEPLOY - Build, Push, i Deploy celog PSP sistema
# =============================================================================
cmd_deploy() {
    print_header "KORAK 3: Deploy PSP Sistema na Swarm"

    # Provera Swarm-a
    if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
        err "Ovaj nod nije deo Swarm-a. Pokreni 'bash deploy-cloud.sh init' prvo."
        exit 1
    fi

    NODE_COUNT=$(docker node ls --format '{{.ID}}' | wc -l)
    echo "Broj nodova u Swarm-u: $NODE_COUNT"

    if [ "$NODE_COUNT" -lt 2 ]; then
        warn "Samo $NODE_COUNT nod u swarm-u. Za multi-host treba minimum 2."
        warn "Worker servisi ce se pokrenuti na manager-u dok se worker ne prikljuci."
        echo ""
        read -p "Nastavi svakako? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            exit 0
        fi
    fi

    # [1/3] Build Docker images
    echo ""
    echo "[1/3] Buildovanje Docker images..."
    SERVICES=(
        "core-service:../psp-services/core-service"
        "bank-service:../psp-services/bank-service"
        "card-service:../psp-services/card-service"
        "paypal-service:../psp-services/paypal-service"
        "crypto-service:../psp-services/crypto-service"
        "api-gateway:../psp-services/api-gateway"
        "web-shop:../web-shop"
    )

    for svc_pair in "${SERVICES[@]}"; do
        svc_name="${svc_pair%%:*}"
        svc_ctx="${svc_pair##*:}"
        echo "  Building ${svc_name}..."
        docker build -t "${REGISTRY}/psp-${svc_name}:latest" "${SCRIPT_DIR}/${svc_ctx}" || {
            err "Neuspesno buildovanje ${svc_name}"
            exit 1
        }
    done
    ok "Svi images buildovani"

    # [2/3] Push na registry (da worker nodovi mogu da ih preuzmu)
    echo ""
    echo "[2/3] Pushovanje images na registry (${REGISTRY})..."
    for svc_pair in "${SERVICES[@]}"; do
        svc_name="${svc_pair%%:*}"
        echo "  Pushing ${svc_name}..."
        docker push "${REGISTRY}/psp-${svc_name}:latest" || {
            err "Neuspesno pushovanje ${svc_name}"
            exit 1
        }
    done
    ok "Svi images pushovani na registry"

    # [3/3] Deploy stack
    echo ""
    echo "[3/3] Deployovanje stack-a..."
    REGISTRY=${REGISTRY} docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"
    ok "Stack deployovan!"

    echo ""
    info "Cekanje 60 sekundi da se svi servisi podignu..."
    echo "(Java/Spring Boot servisi trebaju vise vremena za pokretanje)"
    sleep 60

    cmd_status
}

# =============================================================================
# STATUS - Prikaz statusa Swarm-a i servisa
# =============================================================================
cmd_status() {
    print_header "STATUS PSP SISTEMA"

    echo "--- Swarm Nodovi ---"
    docker node ls
    echo ""

    echo "--- Servisi u Stack-u ---"
    docker stack services "$STACK_NAME" 2>/dev/null || echo "Stack nije deployovan."
    echo ""

    echo "--- Raspored Servisa po Nodovima ---"
    docker stack ps "$STACK_NAME" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null || echo "Stack nije deployovan."
    echo ""

    echo "--- Overlay Mreze (Enkriptovane) ---"
    docker network ls | grep -E "overlay|psp" || true
    echo ""

    # HTTPS provera
    echo "--- HTTPS Provera ---"
    if curl -sk https://localhost/health 2>/dev/null | grep -q "healthy"; then
        ok "HTTPS endpoint radi (TLS aktivan)"
    else
        warn "HTTPS endpoint ne odgovara jos (servisi se mozda jos pokrecu)"
    fi
}

# =============================================================================
# TEST - Testiranje svih aspekata sistema
# =============================================================================
cmd_test() {
    print_header "TESTIRANJE PSP SISTEMA NA CLOUD-U"

    echo "================================================================"
    echo "TEST 1: Multi-Host Distribucija Servisa"
    echo "================================================================"
    echo ""
    echo "Raspored servisa po nodovima:"
    docker stack ps "$STACK_NAME" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null | head -20
    echo ""

    NODES=$(docker stack ps "$STACK_NAME" --format "{{.Node}}" 2>/dev/null | sort -u | wc -l)
    if [ "$NODES" -ge 2 ]; then
        ok "Servisi su rasporedeni na $NODES razlicitih nodova (MULTI-HOST RADI)"
    else
        warn "Servisi su na $NODES nod-u. Dodaj jos Worker nodova za multi-host."
    fi
    echo ""

    echo "================================================================"
    echo "TEST 2: HTTPS / TLS Enkripcija"
    echo "================================================================"
    echo ""

    if curl -sk https://localhost/health 2>/dev/null | grep -q "healthy"; then
        ok "HTTPS radi - odgovor: $(curl -sk https://localhost/health 2>/dev/null)"
        echo ""
        echo "TLS detalji:"
        curl -svk https://localhost/health 2>&1 | grep -E "SSL|TLS|subject|issuer|expire" || true
    else
        warn "HTTPS jos ne odgovara"
    fi
    echo ""

    echo "================================================================"
    echo "TEST 3: Encrypted Overlay Mreza"
    echo "================================================================"
    echo ""
    OVERLAY_NET=$(docker network ls --format "{{.Name}}" | grep -E "psp.*overlay|psp-overlay" | head -1)
    if [ -n "$OVERLAY_NET" ]; then
        ok "Enkriptovana overlay mreza: $OVERLAY_NET"
        docker network inspect "$OVERLAY_NET" --format "Driver: {{.Driver}}, Encrypted: {{index .Options \"encrypted\"}}" 2>/dev/null || true
    else
        warn "Overlay mreza nije pronadena"
    fi
    echo ""

    echo "================================================================"
    echo "TEST 4: Skaliranje (Load Balancing)"
    echo "================================================================"
    echo ""
    echo "Core Service replike:"
    docker service ps "${STACK_NAME}_core-service" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null || true
    echo ""

    echo "Skaliranje core-service na 4 replike..."
    docker service scale "${STACK_NAME}_core-service=4" 2>/dev/null || true
    sleep 10
    echo ""
    echo "Core Service replike posle skaliranja:"
    docker service ps "${STACK_NAME}_core-service" --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null || true
    echo ""

    # Vrati na 2
    docker service scale "${STACK_NAME}_core-service=2" 2>/dev/null || true

    echo "================================================================"
    echo "TEST 5: Visoka Dostupnost (Failover)"
    echo "================================================================"
    echo ""
    echo "Trenutno aktivni nodovi:"
    docker node ls
    echo ""
    info "Za test failover-a, pokreni:"
    info "  docker node update --availability drain <worker-node-name>"
    info "  docker stack ps psp (vidi da su se servisi preselili)"
    info "  docker node update --availability active <worker-node-name>"
    echo ""

    echo "================================================================"
    echo "TEST 6: Replikacija Baze Podataka"
    echo "================================================================"
    echo ""
    echo "Upisivanje podatka u primarnu bazu..."
    # Get the container ID of the primary DB
    PRIMARY_CONTAINER=$(docker ps --filter "name=${STACK_NAME}_psp-core-db-primary" --format "{{.ID}}" | head -1)
    REPLICA_CONTAINER=$(docker ps --filter "name=${STACK_NAME}_psp-core-db-replica" --format "{{.ID}}" | head -1)

    if [ -n "$PRIMARY_CONTAINER" ]; then
        docker exec "$PRIMARY_CONTAINER" psql -U postgres -d psp_core_db -c \
            "CREATE TABLE IF NOT EXISTS test_cloud (info text); INSERT INTO test_cloud (info) VALUES ('CLOUD REPLIKACIJA RADI - $(date)');" 2>/dev/null || true
        echo ""

        if [ -n "$REPLICA_CONTAINER" ]; then
            echo "Citanje iz replike..."
            RESULT=$(docker exec "$REPLICA_CONTAINER" psql -U postgres -d psp_core_db -c "SELECT * FROM test_cloud ORDER BY info DESC LIMIT 1;" 2>/dev/null || true)
            echo "$RESULT"
            if echo "$RESULT" | grep -q "CLOUD REPLIKACIJA"; then
                ok "Replikacija baze RADI!"
            else
                warn "Replikacija se mozda jos inicijalizuje..."
            fi
        else
            warn "Replica container nije pronadjen (mozda je na drugom nodu)"
        fi
    else
        warn "Primary DB container nije pronadjen"
    fi

    echo ""
    print_header "TESTIRANJE ZAVRSENO"
}

# =============================================================================
# SCALE - Skaliranje servisa
# =============================================================================
cmd_scale() {
    SERVICE=$1
    REPLICAS=$2

    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        err "Koriscenje: bash deploy-cloud.sh scale <servis> <broj-replika>"
        echo "Primer: bash deploy-cloud.sh scale core-service 4"
        exit 1
    fi

    docker service scale "${STACK_NAME}_${SERVICE}=${REPLICAS}"
    ok "Servis ${SERVICE} skaliran na ${REPLICAS} replika"
}

# =============================================================================
# TEARDOWN - Uklanjanje stack-a
# =============================================================================
cmd_teardown() {
    print_header "Uklanjanje PSP Stack-a"

    docker stack rm "$STACK_NAME" 2>/dev/null || true
    ok "Stack uklonjen"

    echo "Cekanje da se servisi zaustave..."
    sleep 10

    read -p "Napustiti Swarm takodje? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker swarm leave --force 2>/dev/null || true
        ok "Swarm napusten"
    fi
}

# =============================================================================
# HELP
# =============================================================================
cmd_help() {
    echo "PSP Cloud Deployment - Docker Swarm (2+ Nodova)"
    echo ""
    echo "Koriscenje: bash deploy-cloud.sh <komanda> [opcije]"
    echo ""
    echo "Komande:"
    echo "  init [IP]              Inicijalizuj Swarm na ovoj masini (Manager)"
    echo "  join <IP> <TOKEN>      Prikljuci se Swarm-u kao Worker"
    echo "  deploy                 Build, push i deploy celog sistema"
    echo "  status                 Prikaz statusa Swarm-a i servisa"
    echo "  test                   Pokreni sve testove (HTTPS, HA, skaliranje...)"
    echo "  scale <servis> <n>     Skaliraj servis na n replika"
    echo "  teardown               Ukloni stack i napusti Swarm"
    echo ""
    echo "Cloud Setup (2 masine):"
    echo "  Masina 1 (Manager):  bash deploy-cloud.sh init"
    echo "  Masina 2 (Worker):   bash deploy-cloud.sh join <MANAGER_IP> <TOKEN>"
    echo "  Masina 1 (Manager):  bash deploy-cloud.sh deploy"
    echo "  Masina 1 (Manager):  bash deploy-cloud.sh test"
}

# =============================================================================
# MAIN
# =============================================================================
case "${1:-help}" in
    init)     cmd_init "$2" ;;
    join)     cmd_join "$2" "$3" ;;
    deploy)   cmd_deploy ;;
    status)   cmd_status ;;
    test)     cmd_test ;;
    scale)    cmd_scale "$2" "$3" ;;
    teardown) cmd_teardown ;;
    *)        cmd_help ;;
esac
