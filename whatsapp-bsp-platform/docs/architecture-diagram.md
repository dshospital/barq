# WhatsApp BSP Platform - Architecture Diagram

## 1. System Architecture Overview (C4 Model - Level 3: Component Diagram)

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Dashboard<br/>React + TypeScript]
        MOB[Mobile App<br/>React Native]
        CLI[CLI Tool]
    end

    subgraph "API Gateway Layer"
        NGINX[Nginx Load Balancer]
        GATEWAY[API Gateway<br/>Kong / Traefik]
        AUTH[Auth Service<br/>JWT + OAuth2]
    end

    subgraph "Core Microservices"
        USER[User Service<br/>NestJS]
        CAMPAIGN[Campaign Service<br/>NestJS]
        TEMPLATE[Template Service<br/>NestJS]
        MESSAGE[Message Service<br/>NestJS]
        BILLING[Billing Service<br/>NestJS]
        ANALYTICS[Analytics Service<br/>NestJS]
    end

    subgraph "AI & Intelligence Layer"
        AI[AI Engine<br/>Python/FastAPI]
        LLM[LLM Gateway<br/>OpenAI / Claude]
        SENTIMENT[Sentiment Analyzer]
        SMART_REPLY[Smart Reply Generator]
    end

    subgraph "Integration Layer"
        META[Meta Integration<br/>Service]
        WEBHOOK[Webhook Handler<br/>Service]
        EXTERNAL[External API<br/>Service]
    end

    subgraph "Message Queue Layer"
        REDIS[Redis<br/>BullMQ]
        KAFKA[Kafka<br/>Event Streaming]
        RABBIT[RabbitMQ<br/>Task Queue]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Users & Billing)]
        MONGO[(MongoDB<br/>Messages & Logs)]
        CLICKHOUSE[(ClickHouse<br/>Analytics)]
        REDIS_CACHE[(Redis Cache<br/>Sessions & Rate Limits)]
    end

    subgraph "External Services"
        META_API[Meta Graph API<br/>WhatsApp Business]
        CLOUD[Cloud Storage<br/>S3 / GCS]
        CDN[CDN<br/>CloudFlare]
    end

    %% Client Connections
    WEB --> NGINX
    MOB --> NGINX
    CLI --> GATEWAY

    %% Gateway Flow
    NGINX --> GATEWAY
    GATEWAY --> AUTH
    AUTH --> USER

    %% Service Interconnections
    GATEWAY --> CAMPAIGN
    GATEWAY --> TEMPLATE
    GATEWAY --> MESSAGE
    GATEWAY --> BILLING
    GATEWAY --> ANALYTICS

    %% AI Integration
    MESSAGE --> AI
    AI --> LLM
    AI --> SENTIMENT
    AI --> SMART_REPLY

    %% External Integration
    MESSAGE --> META
    META --> META_API
    WEBHOOK --> META_API
    EXTERNAL --> GATEWAY

    %% Queue Connections
    CAMPAIGN --> REDIS
    MESSAGE --> REDIS
    MESSAGE --> KAFKA
    WEBHOOK --> RABBIT

    %% Database Connections
    USER --> POSTGRES
    CAMPAIGN --> POSTGRES
    TEMPLATE --> POSTGRES
    BILLING --> POSTGRES
    MESSAGE --> MONGO
    WEBHOOK --> MONGO
    ANALYTICS --> CLICKHOUSE

    %% Caching
    USER --> REDIS_CACHE
    MESSAGE --> REDIS_CACHE
    META --> REDIS_CACHE

    %% Storage
    TEMPLATE --> CLOUD
    MESSAGE --> CLOUD
    WEB --> CDN
```

## 2. Data Flow - Message Sending Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant CS as Campaign Service
    participant MS as Message Service
    participant MQ as Message Queue
    participant MW as Message Worker
    participant Meta as Meta API
    participant DB as Database
    participant WH as Webhook Handler

    Client->>API: Create Campaign
    API->>CS: Validate & Store
    CS->>DB: Save Campaign
    CS->>MQ: Queue Messages
    
    par Process Messages
        loop For each message
            MQ->>MW: Pull Message
            MW->>Meta: Send via Graph API
            Meta-->>MW: Response (message_id)
            MW->>DB: Update Status: SENT
        end
    and Handle Webhooks
        Meta-->>WH: Webhook: delivered
        WH->>DB: Update Status: DELIVERED
        Meta-->>WH: Webhook: read
        WH->>DB: Update Status: READ
    end
```

## 3. AI Integration Flow

```mermaid
sequenceDiagram
    participant User
    participant WA as WhatsApp
    participant WH as Webhook Handler
    participant AI as AI Engine
    participant LLM as LLM Provider
    participant Inbox as Shared Inbox
    participant Agent as Human Agent

    User->>WA: Send Message
    WA->>WH: Incoming Message
    WH->>AI: Analyze Message
    
    par AI Processing
        AI->>LLM: Sentiment Analysis
        LLM-->>AI: Sentiment Score
        AI->>LLM: Generate Smart Reply
        LLM-->>AI: Suggested Response
    end
    
    AI->>Inbox: Enriched Message<br/>+ Suggestions
    Inbox->>Agent: Display in Queue
    
    alt Auto-Reply Enabled
        AI->>WA: Send Auto-Response
    else Human Review
        Agent->>WA: Approved Response
    end
```

## 4. Template Approval Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Template
    Draft --> Pending: Submit for Review
    
    Pending --> Approved: Meta Approved
    Pending --> Rejected: Meta Rejected
    
    Rejected --> Draft: Edit & Resubmit
    Approved --> Active: Ready to Use
    
    Active --> Paused: Pause Campaign
    Paused --> Active: Resume
    
    Active --> [*]: Delete
```

## 5. Microservices Communication Pattern

```mermaid
graph LR
    subgraph "Synchronous (REST/gRPC)"
        A[Service A] -->|HTTP/2| B[Service B]
        C[Service C] -->|gRPC| D[Service D]
    end

    subgraph "Asynchronous (Events)"
        E[Service E] -->|Publish| F[Event Bus]
        F -->|Subscribe| G[Service F]
        F -->|Subscribe| H[Service G]
    end

    subgraph "Circuit Breaker Pattern"
        I[Client] -->|Request| J[Circuit Breaker]
        J -->|Closed| K[Service]
        J -->|Open| L[Fallback]
    end
```

## 6. Deployment Architecture (Kubernetes)

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress Layer"
            ING[Ingress Controller]
            CERT[Cert Manager]
        end

        subgraph "Application Namespace"
            subgraph "API Pods"
                API1[API Pod 1]
                API2[API Pod 2]
                API3[API Pod 3]
            end

            subgraph "Worker Pods"
                W1[Message Worker]
                W2[AI Worker]
                W3[Webhook Worker]
            end

            subgraph "CronJobs"
                CJ1[Daily Reports]
                CJ2[Cleanup Jobs]
            end
        end

        subgraph "Data Namespace"
            PG[(PostgreSQL HA)]
            MG[(MongoDB RS)]
            RD[(Redis Cluster)]
            KF[(Kafka)]
        end

        subgraph "Monitoring"
            PROM[Prometheus]
            GRAF[Grafana]
            JAEGER[Jaeger]
        end
    end

    ING --> API1
    ING --> API2
    ING --> API3

    API1 --> W1
    API2 --> RD
    API3 --> PG

    W1 --> MG
    W2 --> KF
    W3 --> RD

    PROM --> API1
    PROM --> W1
```

## 7. Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        DDOS[DDoS Protection]
        
        subgraph "Authentication"
            JWT[JWT Tokens]
            MFA[Multi-Factor Auth]
            RBAC[Role-Based Access]
        end

        subgraph "Data Protection"
            ENC[Encryption at Rest]
            TLS[TLS 1.3 in Transit]
            HASH[Password Hashing<br/>Argon2]
        end

        subgraph "API Security"
            RATE[Rate Limiting]
            CORS[CORS Policy]
            VALID[Input Validation]
        end
    end

    Client --> DDOS
    DDOS --> WAF
    WAF --> JWT
    JWT --> MFA
    MFA --> RBAC
    RBAC --> RATE
    RATE --> VALID
```
