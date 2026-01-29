# WhatsApp BSP Platform - Backend

A high-scalability, microservices-based backend for WhatsApp Business Solution Provider Platform.

## Architecture Overview

This backend is built using a microservices architecture with the following components:

### Services

1. **API Gateway** (`apps/api-gateway`)
   - Main REST API for client applications
   - Authentication & Authorization
   - Rate limiting
   - Request routing

2. **Webhook Handler** (`apps/webhook-handler`)
   - Receives webhooks from Meta WhatsApp API
   - Validates signatures
   - Queues events for processing

3. **Message Worker** (`apps/message-worker`)
   - Processes messages from the queue
   - Sends messages via Meta API
   - Handles retries and failures

### Shared Libraries

- **Database** (`libs/database`): PostgreSQL & MongoDB connections and schemas
- **Queue** (`libs/queue`): BullMQ message queue producers and processors
- **Meta Client** (`libs/meta-client`): Meta WhatsApp API integration
- **AI Client** (`libs/ai-client`): LLM integration (OpenAI, Claude)
- **Shared** (`libs/shared`): Common entities, enums, interfaces, DTOs

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Databases**: 
  - PostgreSQL (relational data)
  - MongoDB (message logs & conversations)
  - Redis (caching & queues)
- **Message Queue**: BullMQ
- **AI Integration**: OpenAI GPT-4, Anthropic Claude
- **Authentication**: JWT
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- MongoDB 7
- Redis 7

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your credentials

5. Start infrastructure services:
   ```bash
   docker-compose up -d postgres mongodb redis
   ```

6. Run migrations:
   ```bash
   npm run migration:run
   ```

7. Start the development server:
   ```bash
   # Terminal 1 - API Gateway
   npm run start:dev

   # Terminal 2 - Webhook Handler
   npm run start:webhook:dev

   # Terminal 3 - Message Worker
   npm run start:worker:dev
   ```

### Using Docker Compose

Start all services at once:
```bash
docker-compose up -d
```

## API Documentation

Once the API Gateway is running, access Swagger documentation at:
```
http://localhost:3000/api/v1/docs
```

## Project Structure

```
backend/
├── apps/
│   ├── api-gateway/          # Main REST API
│   ├── webhook-handler/      # Meta webhook receiver
│   └── message-worker/       # Message processing worker
├── libs/
│   ├── shared/               # Shared entities, enums, DTOs
│   ├── database/             # Database connections & schemas
│   ├── queue/                # BullMQ producers & processors
│   ├── meta-client/          # Meta WhatsApp API client
│   └── ai-client/            # AI/LLM integration
├── docker-compose.yml        # Infrastructure services
├── Dockerfile                # Multi-stage Docker build
└── package.json              # Dependencies & scripts
```

## Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables

- `JWT_SECRET`: Secret key for JWT tokens
- `META_ACCESS_TOKEN`: Meta WhatsApp API access token
- `META_APP_SECRET`: Meta app secret for webhook verification
- `OPENAI_API_KEY`: OpenAI API key for AI features

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Deployment

### Production Build

```bash
# Build all services
npm run build

# Build Docker images
docker build --target production -t whatsapp-bsp-api .
docker build --target webhook -t whatsapp-bsp-webhook .
docker build --target worker -t whatsapp-bsp-worker .
```

### Kubernetes

See `infra/k8s/` directory for Kubernetes deployment manifests.

## Monitoring

- **Metrics**: Prometheus (port 9090)
- **Logs**: Winston with daily rotation
- **Health Checks**: `/health` endpoint

## License

MIT
