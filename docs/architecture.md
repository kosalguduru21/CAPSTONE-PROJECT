# System Architecture: Apartment Maintenance Operations

## 1. High-Level Architectural Diagram

```mermaid
graph TD
    subgraph Client ["Frontend: React 19 + TypeScript + Vite + Tailwind CSS"]
        UI[Responsive Management UI]
        RoleResident[Resident Portal]
        RoleManager[Manager Operations Center]
        RoleTechnician[Vendor Technician Portal]
        AIChatModal[Grounded RAG Assistant Modal]
        ScheduleModal[AI Scheduling Review Modal]
    end

    subgraph Server ["Backend: Express.js REST API (Node.js ES Modules)"]
        Router[API Routers & Middleware]
        AuthSession[Session & Cookie Auth + CSRF]
        AuthZ[Property & Resource Scoped RBAC]
        Services[Business Logic & Audit Services]
        
        subgraph LangChainAI ["AI Subsystem (LangChain JS)"]
            ChatEngine[Grounded RAG Orchestrator]
            VectorService[Atlas Vector Search / Cosine Fallback]
            AgentCore[Bounded Scheduling Agent]
            
            subgraph Tools ["Zod-Validated Agent Tools"]
                T1[readOpenOrders]
                T2[checkVendorSkills]
                T3[intersectAccessWindows]
            end
        end
    end

    subgraph DataPersistence ["Database: MongoDB Atlas (Mongoose ODM)"]
        CollUsers[(Users & Sessions)]
        CollOrders[(Work Orders & Estimates)]
        CollVendors[(Vendors & Technicians)]
        CollDocs[(Documents & Chunks)]
        CollVectors[(Vector Embeddings Index)]
        CollAudits[(Audit Trail & Notifications)]
    end

    subgraph LocalAI ["Local Language Models: Ollama"]
        QwenChat[qwen3:8b - Text Generation]
        QwenEmbed[qwen3-embedding:4b - 2560 Dimensions]
    end

    UI --> Router
    Router --> AuthSession
    AuthSession --> AuthZ
    AuthZ --> Services
    Services --> DataPersistence
    
    Services --> LangChainAI
    ChatEngine --> QwenChat
    ChatEngine --> VectorService
    VectorService --> QwenEmbed
    VectorService --> CollVectors
    
    AgentCore --> T1
    AgentCore --> T2
    AgentCore --> T3
    T1 --> CollOrders
    T2 --> CollVendors
    T3 --> Services
```

## 2. Component Structure

- **Client Tier**:
  - React 19 with Vite, TypeScript, Tailwind CSS v4, Lucide React icons.
  - Role-based views: Resident (Unit-scoped), Property Manager (Property-scoped), Vendor Technician (Assignment-scoped).
  - API Client handles HttpOnly cookie session credentials, automated CSRF header forwarding, and standard error serialization.
  - Interactive modals for grounded RAG maintenance chat with verified citations, and human-in-the-loop AI scheduling proposal review.

- **API & Middleware Tier**:
  - Express.js backend written in modern ES modules following the code style of `mern-ai-integration-patterns`.
  - Session-based authentication stored in MongoDB (`SessionModel`) with HttpOnly cookies.
  - Centralized authorization middleware verifying property and unit ownership before data retrieval.
  - Multer middleware generating cryptographically secure UUID filenames for text-based PDF/TXT uploads.

- **AI Orchestration Tier**:
  - **Document RAG**: Document text extraction via `unpdf`, chunk splitting, Ollama embeddings generation (`qwen3-embedding:4b`), and similarity search with citations. Built-in emergency detector and hazardous DIY prevention guardrails.
  - **Semantic Related-Case Discovery**: Scoped strictly to the same property to identify related issues (e.g. upstairs leaks affecting downstairs ceilings) without leaking other property records.
  - **Bounded Scheduling Agent**: 3 deterministic tools (`readOpenOrders`, `checkVendorSkills`, `intersectAccessWindows`) with Zod argument validation. AI produces proposals; manager explicitly approves via atomic confirmation endpoint.
