# =============================================================================
# PSP Multi-Host Swarm Deployment Script (PowerShell)
# =============================================================================
# Usage (na Manager racunaru):
#   .\deploy-swarm.ps1 init
#   .\deploy-swarm.ps1 deploy
#   .\deploy-swarm.ps1 status
#   .\deploy-swarm.ps1 teardown
#
# Usage (na Worker racunaru):
#   .\deploy-swarm.ps1 join <MANAGER_IP> <TOKEN>
# =============================================================================

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1,
    [Parameter(Position=2)]
    [string]$Arg2
)

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$STACK_NAME = "psp"
$COMPOSE_FILE = Join-Path $SCRIPT_DIR "docker-compose-swarm.yml"
if (-not $env:REGISTRY) { $REGISTRY = "localhost:5000" } else { $REGISTRY = $env:REGISTRY }

function Write-Header($msg) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Blue
    Write-Host "  $msg" -ForegroundColor Blue
    Write-Host "=================================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[X]  $msg" -ForegroundColor Red }

# =============================================================================
# INIT
# =============================================================================
function Cmd-Init {
    Write-Header "Initializing Docker Swarm (Manager Node)"

    # Get IP
    if ($Arg1) {
        $MANAGER_IP = $Arg1
    } else {
        $MANAGER_IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
    }
    Write-Host "Manager IP: $MANAGER_IP"

    # Check if already in swarm
    $swarmState = docker info --format '{{.Swarm.LocalNodeState}}' 2>$null
    if ($swarmState -eq "active") {
        Write-Warn "This node is already part of a Swarm"
        $token = docker swarm join-token worker -q
        Write-Host ""
        Write-Host "Worker join token: $token"
        Write-Host ""
        Write-Host "Run this on Worker node:"
        Write-Host "  docker swarm join --token $token ${MANAGER_IP}:2377"
        return
    }

    # Init swarm
    Write-Host "[1/4] Initializing Swarm cluster..."
    if ($MANAGER_IP) {
        $initResult = docker swarm init --advertise-addr $MANAGER_IP 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Init with --advertise-addr failed, trying without..."
            docker swarm init
        }
    } else {
        docker swarm init
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Swarm init failed. Check Docker Desktop settings."
        return
    }
    Write-Ok "Swarm initialized"

    # Get token
    Write-Host ""
    Write-Host "[2/4] Getting worker join token..."
    $WORKER_TOKEN = docker swarm join-token worker -q
    Write-Ok "Worker token: $WORKER_TOKEN"

    # SSL certificates
    Write-Host ""
    Write-Host "[3/4] Checking SSL certificates..."
    $certPath = Join-Path $SCRIPT_DIR "ssl\server.crt"
    if (Test-Path $certPath) {
        Write-Warn "SSL certificates already exist, skipping"
    } else {
        Write-Host "Generating SSL certificates..."
        New-Item -ItemType Directory -Force -Path (Join-Path $SCRIPT_DIR "ssl") | Out-Null
        docker run --rm -v "${SCRIPT_DIR}/ssl:/ssl" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout /ssl/server.key -out /ssl/server.crt -subj "/C=RS/ST=Serbia/L=Belgrade/O=PSP/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
        Write-Ok "SSL certificates generated"
    }

    # Local registry
    Write-Host ""
    Write-Host "[4/4] Starting local Docker registry..."
    $regExists = docker service ls 2>$null | Select-String "registry"
    if ($regExists) {
        Write-Warn "Registry already running"
    } else {
        docker service create --name registry --publish published=5000,target=5000 registry:2 2>$null
        Write-Ok "Local registry started at ${MANAGER_IP}:5000"
    }

    Write-Host ""
    Write-Header "SWARM INITIALIZED SUCCESSFULLY"
    Write-Host "================================================================"
    Write-Host ""
    Write-Host "  NEXT STEP: Run this on the WORKER machine (Racunar 2):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    docker swarm join --token $WORKER_TOKEN ${MANAGER_IP}:2377" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then come back here and run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    .\deploy-swarm.ps1 deploy" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "================================================================"
}

# =============================================================================
# JOIN
# =============================================================================
function Cmd-Join {
    if (-not $Arg1 -or -not $Arg2) {
        Write-Err "Usage: .\deploy-swarm.ps1 join <MANAGER_IP> <TOKEN>"
        return
    }

    Write-Header "Joining Docker Swarm as Worker Node"
    Write-Host "Manager IP: $Arg1"
    docker swarm join --token $Arg2 "${Arg1}:2377"
    Write-Ok "Successfully joined the Swarm!"
    Write-Host "This node is now a Worker. The Manager will deploy services here."
}

# =============================================================================
# DEPLOY
# =============================================================================
function Cmd-Deploy {
    Write-Header "Deploying PSP Stack to Swarm"

    $swarmState = docker info --format '{{.Swarm.LocalNodeState}}' 2>$null
    if ($swarmState -ne "active") {
        Write-Err "This node is not part of a Swarm. Run '.\deploy-swarm.ps1 init' first."
        return
    }

    $nodeCount = (docker node ls --format '{{.ID}}' | Measure-Object -Line).Lines
    Write-Host "Swarm nodes: $nodeCount"

    if ($nodeCount -lt 2) {
        Write-Warn "Only $nodeCount node(s) in swarm. For multi-host you need at least 2."
        Write-Warn "Worker services will run on manager until a worker joins."
        $confirm = Read-Host "Continue anyway? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") { return }
    }

    # Build
    Write-Host ""
    Write-Host "[1/3] Building Docker images..."
    $services = @(
        @{ name="core-service";   ctx="../psp-services/core-service" },
        @{ name="bank-service";   ctx="../psp-services/bank-service" },
        @{ name="card-service";   ctx="../psp-services/card-service" },
        @{ name="paypal-service"; ctx="../psp-services/paypal-service" },
        @{ name="crypto-service"; ctx="../psp-services/crypto-service" },
        @{ name="api-gateway";    ctx="../psp-services/api-gateway" },
        @{ name="web-shop";       ctx="../web-shop" }
    )

    foreach ($svc in $services) {
        Write-Host "  Building $($svc.name)..."
        docker build -t "${REGISTRY}/psp-$($svc.name):latest" $svc.ctx
        if ($LASTEXITCODE -ne 0) { Write-Err "Failed to build $($svc.name)"; return }
    }
    Write-Ok "All images built"

    # Push
    Write-Host ""
    Write-Host "[2/3] Pushing images to registry ($REGISTRY)..."
    foreach ($svc in $services) {
        docker push "${REGISTRY}/psp-$($svc.name):latest"
        if ($LASTEXITCODE -ne 0) { Write-Err "Failed to push $($svc.name)"; return }
    }
    Write-Ok "All images pushed to registry"

    # Deploy
    Write-Host ""
    Write-Host "[3/3] Deploying stack..."
    $env:REGISTRY = $REGISTRY
    docker stack deploy -c $COMPOSE_FILE $STACK_NAME
    Write-Ok "Stack deployed!"

    Write-Host ""
    Write-Host "Waiting 30 seconds for services to start..."
    Start-Sleep -Seconds 30

    Cmd-Status
}

# =============================================================================
# STATUS
# =============================================================================
function Cmd-Status {
    Write-Header "PSP Swarm Status"

    Write-Host "--- Swarm Nodes ---"
    docker node ls
    Write-Host ""

    Write-Host "--- Stack Services ---"
    docker stack services $STACK_NAME 2>$null
    Write-Host ""

    Write-Host "--- Service Distribution Across Nodes ---"
    docker stack ps $STACK_NAME --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}\t{{.Error}}" 2>$null
    Write-Host ""

    Write-Host "--- Network Info ---"
    docker network ls | Select-String -Pattern "overlay|psp"
    Write-Host ""

    Write-Host "--- HTTPS Check ---"
    try {
        $resp = Invoke-WebRequest -Uri "https://localhost/health" -SkipCertificateCheck -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($resp.Content -match "healthy") {
            Write-Ok "HTTPS endpoint is responding (TLS active)"
        } else {
            Write-Warn "HTTPS endpoint returned unexpected response"
        }
    } catch {
        Write-Warn "HTTPS endpoint not responding yet (services may still be starting)"
    }
}

# =============================================================================
# TEARDOWN
# =============================================================================
function Cmd-Teardown {
    Write-Header "Tearing Down PSP Stack"

    docker stack rm $STACK_NAME 2>$null
    Write-Ok "Stack removed"

    Write-Host "Waiting for services to stop..."
    Start-Sleep -Seconds 10

    $confirm = Read-Host "Also leave the Swarm? (y/N)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        docker swarm leave --force 2>$null
        Write-Ok "Left the Swarm"
    }
}

# =============================================================================
# SCALE
# =============================================================================
function Cmd-Scale {
    if (-not $Arg1 -or -not $Arg2) {
        Write-Err "Usage: .\deploy-swarm.ps1 scale <service-name> <replicas>"
        Write-Host "Example: .\deploy-swarm.ps1 scale core-service 4"
        return
    }
    docker service scale "${STACK_NAME}_${Arg1}=${Arg2}"
    Write-Ok "Scaled $Arg1 to $Arg2 replicas"
}

# =============================================================================
# MAIN
# =============================================================================
switch ($Command) {
    "init"     { Cmd-Init }
    "join"     { Cmd-Join }
    "deploy"   { Cmd-Deploy }
    "status"   { Cmd-Status }
    "scale"    { Cmd-Scale }
    "teardown" { Cmd-Teardown }
    default {
        Write-Host "PSP Multi-Host Swarm Deployment (PowerShell)"
        Write-Host ""
        Write-Host "Usage: .\deploy-swarm.ps1 <command> [options]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  init [IP]              Initialize Swarm on this machine (Manager)"
        Write-Host "  join <IP> <TOKEN>      Join an existing Swarm as Worker"
        Write-Host "  deploy                 Build, push images, and deploy stack"
        Write-Host "  status                 Show Swarm and stack status"
        Write-Host "  scale <svc> <n>        Scale a service to n replicas"
        Write-Host "  teardown               Remove the stack and optionally leave Swarm"
        Write-Host ""
        Write-Host "Multi-Host Setup (2 racunara):"
        Write-Host "  Racunar 1 (Manager):   .\deploy-swarm.ps1 init"
        Write-Host "  Racunar 2 (Worker):    .\deploy-swarm.ps1 join <MANAGER_IP> <TOKEN>"
        Write-Host "  Racunar 1 (Manager):   .\deploy-swarm.ps1 deploy"
    }
}
