# Apartment Maintenance Operations

> An AI-Powered Full-Stack Capstone Application connecting Residents, Property Managers, and Vendor Technicians with Grounded Document RAG, Atlas Vector Search Semantic Discovery, and Bounded Scheduling Agents.

Built in strict adherence to the coding style and architecture of [`mern-ai-integration-patterns`](https://github.com/rajeshThappeta/mern-ai-integration-patterns).

---

## 1. System Overview

**Apartment Maintenance Operations** is a production-grade web application designed for multi-family residential communities. The platform coordinates the entire maintenance lifecycle while leveraging bounded local AI for document retrieval, cross-unit similarity correlation, and conflict-safe schedule generation.

### Key Capabilities
- **Three Core User Roles**:
  - **Resident**: Report issues with category, priority, private access notes, and preferred visit windows; track status timeline; review itemized estimates; inspect vendor completion evidence; confirm resolution or request case reopening.
  - **Property Manager**: Operations dashboard with real-time stored metrics; property-scoped work order triage; approved vendor assignment; deterministic estimate review with spending limits ($500 threshold); semantic related-case investigation; bounded AI scheduling with human-in-the-loop explicit sign-off; policy document ingestion library.
  - **Vendor Technician**: Scope-isolated assigned jobs; visit window proposals; progress updater (`In Progress`, `Work Completed — Awaiting Review`); upload completion notes and photographic evidence; build itemized estimates.
- **AI Feature 1: Document-Grounded Conversational RAG**:
  - Ingests text-based PDF/TXT apartment policies, tenant vs. landlord responsibility rules, and appliance manuals.
  - Extracts text via `unpdf`, splits into chunks, and vectorizes using local Ollama (`qwen3-embedding:4b`).
  - Answers questions with chunk and document citations.
  - Built-in guardrails: detects life-safety emergencies (gas, flood, fire) to bypass chat and provide direct 911/emergency dispatch numbers; blocks unsafe DIY electrical/gas advice.
- **AI Feature 2: Semantic Related-Case Discovery**:
  - Vector similarity search across maintenance complaints isolated strictly to the same property.
  - Detects shared root causes (e.g. upstairs bathroom leak causing downstairs kitchen ceiling drips).
  - Explicit distinction between statistical similarity and verified root cause.
- **AI Feature 3: Bounded Maintenance Scheduling Agent**:
  - Powered by LangChain JavaScript with 3 Zod-validated deterministic tools:
    1. `readOpenOrders`: Retrieves non-emergency open tickets.
    2. `checkVendorSkills`: Matches trades to active, approved vendors (excludes suspended vendors).
    3. `intersectAccessWindows`: Finds collision-free slots between resident access windows and technician availability.
  - Drafts proposals with tool telemetry; requires explicit manager approval via atomic confirmation endpoint.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend**: Node.js & Express.js REST API (ES Modules, `strict: "throw"`, `versionKey: false`).
- **Database**: MongoDB Atlas / Local MongoDB with Mongoose ODM (18 models).
- **Vector Search**: MongoDB Atlas Vector Search (with local development cosine similarity fallback).
- **AI & Embeddings**: Local Ollama:
  - Generation Model: `qwen3:8b` (8.2B parameters)
  - Embedding Model: `qwen3-embedding:4b` (2560 dimensions)
- **AI Orchestration**: LangChain JavaScript (`@langchain/core`, `@langchain/ollama`, `@langchain/textsplitters`).
- **Input Validation**: Zod & custom business validators.
- **Authentication**: Opaque server sessions stored in MongoDB, HttpOnly secure cookies, CSRF tokens.
- **Testing**: Vitest, Supertest (38 automated unit, integration, and AI benchmark tests).

---

## 3. Directory Structure

```
├── backend/
│   ├── api/                  # Express REST route handlers
│   ├── middlewares/          # Auth, RBAC, Multer, Error handlers
│   ├── models/               # 18 Mongoose ODM schemas
│   ├── seed/                 # Reproducible seed script
│   ├── services/             # LLM, Vector, Scheduling, Audit services
│   ├── tests/                # Vitest & Supertest test suites
│   │   ├── auth.test.js
│   │   ├── authorization.test.js
│   │   ├── work-order.test.js
│   │   ├── scheduling.test.js
│   │   └── ai-evaluation.test.js  # 15 AI benchmark test cases
│   ├── tools/                # LangChain Zod-validated scheduling tools
│   ├── validators/           # Zod schemas for input validation
│   ├── server.js             # Express application entrypoint
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── api/              # Client API helper with CSRF handling
│   │   ├── components/       # Common UI, Chat Modal, Scheduling Modal
│   │   ├── context/          # Auth & Notification contexts
│   │   ├── pages/            # Resident, Manager, Vendor, Public pages
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Main application routing
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── docs/                     # Architecture, Access Control, Schema, Demos
└── README.md
```

---

## 4. Quick Start & Prerequisites

### Prerequisites
1. **Node.js**: v18+ or v20+ recommended.
2. **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/apartment_maintenance`) or MongoDB Atlas cluster.
3. **Ollama**: Installed locally with models pulled:
   ```bash
   ollama pull qwen3:8b
   ollama pull qwen3-embedding:4b
   ```

### 1. Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env

# Seed reproducible test data (properties, units, users, orders, vectors)
npm run seed

# Run backend dev server (starts on http://localhost:5000)
npm run dev
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install

# Run frontend dev server (starts on http://localhost:5173 with auto-proxy)
npm run dev
```

---

## 5. Demo Accounts & Credentials

| Role | Name | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Property Manager** | Sarah Jenkins | `manager.sarah@grandheights.com` | `Password123!` | Grand Heights & Oakwood Terrace |
| **Resident (Unit 101)** | Alex Rivera | `resident.alex@grandheights.com` | `Password123!` | Unit 101, Grand Heights Building A |
| **Resident (Unit 201)** | Brian Chen | `resident.brian@grandheights.com` | `Password123!` | Unit 201, Grand Heights Building A |
| **Vendor Technician** | Mario Rossi | `tech.mario@quickflow.com` | `Password123!` | QuickFlow Plumbing |
| **Electrician Tech** | Elena Vance | `tech.elena@voltmaster.com` | `Password123!` | VoltMaster Electrical |

> **Interactive Demo Switcher:** When testing in the browser, click the **"Demo Role" dropdown** in the top navigation bar to switch personas with one click!

---

## 6. Automated Testing & AI Evaluation

Run the automated test suite from the `backend/` directory:

```bash
cd backend
npx vitest run
```

### Test Coverage Highlights
- **`tests/auth.test.js`**: User registration, login, session rotation, logout, unauthenticated 401 checks.
- **`tests/authorization.test.js`**: Cross-resident isolation, cross-property manager scope isolation, unassigned vendor 403 checks.
- **`tests/work-order.test.js`**: Ticket creation, status transitions, server-side estimate calculations, completion review & reopening.
- **`tests/scheduling.test.js`**: Tool execution, emergency exclusions, unapproved vendor filtering, atomic schedule confirmation.
- **`tests/ai-evaluation.test.js`**: **All 15 benchmark AI queries**:
  1. Related-case discovery (matches Unit 101 ceiling drip to Unit 201 subfloor leak).
  2. Property isolation in vector search.
  3. Grounded maintenance policy explanation with source citations.
  4. Equipment manual operating limits.
  5. Insufficient evidence handling (refuses to hallucinate unknown warranties).
  6. Emergency protocol activation for life safety.
  7. Block hazardous DIY advice (electrical circuit breaker safety).
  8. Exclusion of emergency orders from automated scheduling.
  9. Vendor trade skill matching.
  10. Conflict detection for overlapping visits.
  11. Suspension filtering for ineligible contractors.
  12. Bounded agent proposal generation without unsolicited live mutations.
  13. Stale estimate version rejection.
  14. Duplicate schedule confirmation prevention.
  15. Tool error handling and process safety.

---

## 7. Atlas Vector Search Configuration

When configuring MongoDB Atlas Vector Search on the `chunks` collection:
- **Index Name**: `vector_index`
- **Field**: `embedding`
- **Dimensions**: `2560` (matches `qwen3-embedding:4b`)
- **Similarity Metric**: `cosine`
- **Filter Fields**: `propertyId`

```json
{
  "fields": [
    {
      "numDimensions": 2560,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "propertyId",
      "type": "filter"
    }
  ]
}
```

---

## 8. Documentation Index

- [System Architecture & Diagrams](docs/architecture.md)
- [Access Control & Authorization Model](docs/access-control.md)
- [Database Schema & Data Relationships](docs/database-schema.md)
- [Step-by-Step Demonstration Script](docs/demo-script.md)
- [Postman API Collection](docs/postman_collection.json)

---

## 9. Known Limitations & Local Model Notes

- **Ollama Inference Time**: `qwen3:8b` is an 8.2-billion-parameter model. On CPU-only environments, full chat completions typically take 20–50 seconds. The frontend features glowing loading indicators and status messages while generation is in progress.
- **OCR Extension**: The document ingestion engine processes digital, text-based PDF and TXT files using `unpdf`. Scanned image-only PDFs without text layers require an optional OCR preprocessor (e.g. Tesseract) which can be enabled as a future enhancement.
