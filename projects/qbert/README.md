# qbert

A lightweight Kubernetes API server that provides HTTP endpoints to query and modify deployment replica counts.

## Prerequisites

- Go 1.25+
- Docker
- kubectl
- Local Kubernetes cluster (Colima, KIND, or similar)

## Project Structure

```
qbert/
├── cmd/
│   └── server/
│       └── main.go          # HTTP server entry point
├── pkg/
│   ├── api/
│   │   └── handler.go       # HTTP handlers
│   └── k8s/
│       ├── client.go        # Kubernetes client wrapper
│       └── client_test.go   # Unit tests
├── deploy/
│   └── deployment.yaml      # Kubernetes manifests
├── Dockerfile               # Multi-stage Docker build
├── go.mod                   # Go module definition
└── go.sum                   # Go module checksums
```

## Quick Start with Makefile

```bash
# See all available commands
make help

# Run unit tests
make test-unit

# Run integration tests (requires qbert deployed to cluster)
make test-integration

# Build Docker image and deploy to Colima
make deploy

# Check deployment status
make status

# View logs
make logs

# Redeploy after code changes
make redeploy
```

## Running Locally

### Option 1: Run directly with Go

```bash
# Install dependencies
go mod download

# Run the server (requires local kubeconfig)
go run cmd/server/main.go
```

The server will start on port 8080 and use your local `~/.kube/config` for authentication.

### Option 2: Run tests

```bash
# Run all tests
make test

# Run unit tests only
make test-unit

# Run integration tests (requires cluster and deployed qbert)
make test-integration

# Run with coverage report
make coverage
```

## Building and Deploying to Kubernetes

### Using Colima (Recommended for macOS)

```bash
# Start Colima with Kubernetes
colima start --kubernetes --cpu 4 --memory 8

# Set kubectl context
kubectl config use-context colima

# Build and deploy using Makefile
make deploy

# Or manually:
docker build -t qbert:latest .
kubectl apply -f deploy/
kubectl wait --for=condition=available deployment/qbert --timeout=60s
```

### Using KIND

```bash
# Create KIND cluster
kind create cluster --name qbert-test

# Build and load image
docker build -t qbert:latest .
kind load docker-image qbert:latest --name qbert-test

# Deploy
kubectl apply -f deploy/
kubectl wait --for=condition=available deployment/qbert --timeout=60s
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods -l app=qbert

# Check service
kubectl get svc qbert

# View logs
kubectl logs -l app=qbert -f
```

### Update After Code Changes

```bash
# Using Makefile
make redeploy

# Or manually
docker build -t qbert:latest .
kubectl rollout restart deployment qbert
kubectl rollout status deployment qbert
```

## API Endpoints

### 1. Health Check

Check if the service is running.

**Endpoint:** `GET /health`

**Example:**
```bash
curl http://localhost:30080/health
```

**Response:**
```
ok
```

### 2. Get Deployment Replica Count

Retrieve the replica count for a specific deployment.

**Endpoint:** `GET /deployments/{namespace}/{name}/replicas`

**Parameters:**
- `namespace` - Kubernetes namespace (e.g., `default`, `kube-system`)
- `name` - Deployment name (e.g., `qbert`, `coredns`)

**Example - Success:**
```bash
curl http://localhost:30080/deployments/default/qbert/replicas
```

**Response:**
```json
{
  "replicas": 1
}
```

**Example - Not Found:**
```bash
curl http://localhost:30080/deployments/default/nonexistent/replicas
```

**Response:**
```json
{
  "error": "deployment not found"
}
```

**Example - Query Different Namespace:**
```bash
curl http://localhost:30080/deployments/kube-system/coredns/replicas
```

### 3. Set Deployment Replica Count

Update the replica count for a specific deployment.

**Endpoint:** `PUT /deployments/{namespace}/{name}/replicas`

**Parameters:**
- `namespace` - Kubernetes namespace (e.g., `default`, `kube-system`)
- `name` - Deployment name (e.g., `nginx`, `qbert`)

**Request Body:**
```json
{
  "replicas": 5
}
```

**Example - Success:**
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"replicas": 5}' \
  http://localhost:30080/deployments/default/nginx/replicas
```

**Response:**
```json
{
  "message": "replica count updated successfully"
}
```

**Example - Scale to Zero:**
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"replicas": 0}' \
  http://localhost:30080/deployments/default/nginx/replicas
```

**Example - Invalid Input (Negative Replicas):**
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"replicas": -1}' \
  http://localhost:30080/deployments/default/nginx/replicas
```

**Response:**
```json
{
  "error": "replica count cannot be negative"
}
```

**Example - Deployment Not Found:**
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"replicas": 5}' \
  http://localhost:30080/deployments/default/nonexistent/replicas
```

**Response:**
```json
{
  "error": "deployment not found"
}
```

**Verify the Change:**
```bash
# Check the deployment status
kubectl get deployment nginx

# Or query via API
curl http://localhost:30080/deployments/default/nginx/replicas
```

## RBAC Permissions

The qbert service requires specific Kubernetes permissions to function:

**ServiceAccount**: `qbert`
**ClusterRole Permissions**:
- **apiGroups**: `apps`
- **resources**: `deployments`
- **verbs**: `get`, `list`, `update`, `patch`

These permissions allow qbert to:
- Read deployment information across all namespaces (`get`, `list`)
- Modify deployment replica counts (`update`, `patch`)

The RBAC configuration is included in [deploy/deployment.yaml](deploy/deployment.yaml) and is automatically applied when you deploy the service.

## Testing

### Unit Tests

Unit tests use fake Kubernetes clientsets and don't require a running cluster:

```bash
# Run all unit tests
make test-unit

# Run with coverage
make coverage

# Run specific package
go test -v ./pkg/k8s/
go test -v ./pkg/api/
```

### Integration Tests

Integration tests run against a real Kubernetes cluster and test the full HTTP API:

**Prerequisites:**
- qbert deployed to cluster
- Cluster accessible via kubectl

**Test Structure:**
- `HealthEndpointTestSuite` - Tests the `/health` endpoint
- `GetReplicasTestSuite` - Tests `GET /deployments/{namespace}/{name}/replicas`
- `PutReplicasTestSuite` - Tests `PUT /deployments/{namespace}/{name}/replicas`

Each test suite:
1. Creates a test namespace (`integration-test`)
2. Deploys test workloads (nginx)
3. Runs HTTP tests against qbert API
4. Cleans up resources

**Running Integration Tests:**

```bash
# Using Makefile (recommended)
make test-integration

# Or directly with go test
go test -v ./test/

# Run specific test suite
go test -v ./test/ -run TestGetReplicasTestSuite
go test -v ./test/ -run TestPutReplicasTestSuite

# Run specific test
go test -v ./test/ -run TestGetReplicasTestSuite/TestGetReplicas_Success
```

**What the tests verify:**
- ✅ Health endpoint returns 200 OK
- ✅ GET retrieves correct replica counts
- ✅ GET returns 404 for non-existent deployments
- ✅ PUT successfully scales deployments up/down
- ✅ PUT validates replica counts (0 is allowed, negative is rejected)
- ✅ Changes are applied to actual Kubernetes deployments

## Accessing the Service

### Local Development (NodePort)

The service is exposed as a NodePort on port 30080:

```bash
# Direct access (no port-forward needed)
curl http://localhost:30080/health
curl http://localhost:30080/deployments/default/qbert/replicas

# Set replica count
curl -X PUT -H "Content-Type: application/json" \
  -d '{"replicas": 3}' \
  http://localhost:30080/deployments/default/qbert/replicas
```

## Development Tools

### Makefile Targets

All common development tasks are automated via the Makefile:

| Target | Description |
|--------|-------------|
| `make help` | Display all available targets |
| `make build` | Build the Go binary |
| `make run` | Build and run locally |
| `make test` | Run all tests (unit + integration) |
| `make test-unit` | Run unit tests only |
| `make test-integration` | Run integration tests |
| `make docker-build` | Build Docker image |
| `make deploy` | Build and deploy to Kubernetes |
| `make redeploy` | Rebuild and restart deployment |
| `make status` | Check deployment status |
| `make logs` | View application logs |
| `make clean` | Remove build artifacts |
| `make clean-deploy` | Delete Kubernetes resources |
| `make fmt` | Format Go code |
| `make vet` | Run go vet |
| `make lint` | Run golangci-lint |
| `make deps` | Download and tidy dependencies |
| `make check` | Run fmt, vet, and unit tests |
| `make coverage` | Generate coverage report |

## Project Status

### Level 1 - Basic GET API ✅ Complete
- [x] HTTP GET endpoint for replica count
- [x] Kubernetes client wrapper
- [x] Unit tests (happy + unhappy paths)
- [x] Dockerfile with multi-stage build
- [x] Kubernetes manifests (Deployment, Service, RBAC)
- [x] README with deployment instructions

### Level 2 - Write Operations & Integration Tests ✅ Complete
- [x] HTTP PUT endpoint for setting replicas
- [x] Extended Kubernetes client with write operations
- [x] Unit tests for PUT operations
- [x] Integration tests against real cluster
- [x] Test automation with testify/suite
- [x] Automatic test namespace creation/cleanup
- [x] Updated RBAC with write permissions
- [x] Makefile for development automation
- [x] Comprehensive documentation

### Next Steps (Level 3+)
See `levels/level-3.md` for advanced features like:
- Metrics and observability
- Rate limiting
- Authentication/Authorization
- Multi-cluster support