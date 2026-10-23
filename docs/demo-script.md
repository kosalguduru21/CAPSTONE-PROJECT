# Demonstration Script: Apartment Maintenance Operations

This walkthrough demonstrates the end-to-end scenario required by Section 19 of the project specifications.

---

## Demo Accounts & Credentials

| Role | Persona Name | Email | Password | Scope / Context |
| :--- | :--- | :--- | :--- | :--- |
| **Property Manager** | Sarah Jenkins | `manager.sarah@grandheights.com` | `Password123!` | Grand Heights Apartments & Oakwood Terrace |
| **Resident A** | Alex Rivera | `resident.alex@grandheights.com` | `Password123!` | Unit 101, Grand Heights Building A |
| **Resident B** | Brian Chen | `resident.brian@grandheights.com` | `Password123!` | Unit 201, Grand Heights Building A |
| **Vendor Technician** | Mario Rossi | `tech.mario@quickflow.com` | `Password123!` | QuickFlow Plumbing (Licensed Service) |
| **Electrician Tech** | Elena Vance | `tech.elena@voltmaster.com` | `Password123!` | VoltMaster Electrical Services |

> **Tip:** You can switch between these personas instantly using the **"Demo Role" dropdown** in the top navigation bar!

---

## Step-by-Step Scenario Execution

### Step 1: Resident A Submits Water Leak Report
1. Click **Demo Role -> Resident (Alex Rivera)** in the navbar.
2. Click **New Request** in the sidebar.
3. Fill in the form:
   - **Trade Category**: Plumbing
   - **Priority**: Normal
   - **Subject**: Water leaking from kitchen ceiling
   - **Description**: Water is dripping down slowly from the kitchen ceiling right near the upper light fixture. Noticed a brown discoloration circle that expanded overnight.
   - **Preferred Windows**: Choose upcoming dates, Morning (8am-12pm).
   - **Access Notes**: Please knock loudly; cat is crated in bedroom.
4. Click **Submit Maintenance Request**. Note the generated tracking reference (e.g. `WO-2026-1042`).

### Step 2: Resident B Submits Correlated Complaint
1. Note the existing seeded ticket for Resident B (`resident.brian@grandheights.com` in Unit 201 directly above Unit 101):
   - **Subject**: Loose bathroom sink trap and subfloor dampness
   - **Description**: P-trap under the bathroom sink has an intermittent leak that soaked through the subfloor linoleum.

### Step 3 & 4: Manager Investigates Related Cases via Atlas Vector Search
1. Switch to **Property Manager (Sarah Jenkins)**.
2. In the sidebar, click **Related Case Discovery** (tagged with `Vector` badge).
3. Select `WO-2026-1042` (Alex Rivera's ceiling leak) as the **Anchor Complaint**.
4. The system executes MongoDB Atlas Vector Search embeddings (`qwen3-embedding:4b`, 2560 dims).
5. Notice that Unit 201's subfloor leak appears with **~78-85% Semantic Match**:
   - The UI displays side-by-side comparison.
   - Explicit disclaimer: *"AI suggests potential correlation (e.g. shared plumbing stack); human manager verification required before determining common root cause."*
   - Property isolation check: tickets from Oakwood Terrace are strictly excluded.

### Step 5 & 6: AI Scheduling Agent Proposes Inspection Plan
1. In the sidebar, click **AI Scheduling Agent** (tagged with `Agent` badge).
2. Click **Generate Next Week's Schedule**.
3. The LangChain agent invokes the 3 bounded tools:
   - `readOpenOrders`: Pulls open, non-emergency tickets (excluding emergency tickets).
   - `checkVendorSkills`: Verifies licensed plumbing skills for QuickFlow Plumbing; excludes unapproved vendors.
   - `intersectAccessWindows`: Finds collision-free slots intersecting resident preferred windows with technician availability.
4. The proposal modal opens displaying:
   - Tool execution telemetry (status, milliseconds, Zod-validated arguments).
   - Feasible scheduled visits and any detected constraints.

### Step 7 & 8: Manager Explicitly Approves & Commits Schedule
1. Review the proposed slots. Notice that AI **does not** automatically commit database changes.
2. Click **Confirm & Atomically Commit Schedule**.
3. The backend confirms that no conflicting reservations occurred, commits the visit, transitions order status to `Scheduled`, and records the audit event.

### Step 9: Notifications Dispatched
1. Open the **Notification Bell** icon in the navbar.
2. Notice the in-app confirmation notification: *"Maintenance visit scheduled for WO-2026-1042."*

### Step 10: Vendor Technician Executes Work & Submits Evidence
1. Switch to **Vendor Technician (Mario Rossi)**.
2. In the dashboard, click on the assigned work order.
3. Click **Start Work (In Progress)** to transition status.
4. Click **Submit Estimate** to record itemized labor and parts ($170 labor + $45 part + 8.25% tax).
5. Once repair is finished, click **Complete Work & Upload Evidence**:
   - Enter work performed: *"Replaced corroded PVC drain joint and sealed ceiling pipe sleeve. Pressure tested with no leaks."*
   - Upload repair photo or invoice file.
   - Status transitions to `Work Completed — Awaiting Review`.

### Step 11 & 12: Resident Reviews & Requests Reopening
1. Switch back to **Resident (Alex Rivera)**.
2. Open `WO-2026-1042`.
3. Notice the completion banner displaying technician's work notes and photos.
4. Test reopening capability:
   - Click **Request Reopen**.
   - Enter reason: *"Water drop appeared again 2 hours after technician left."*
   - Work order status updates to `Reopened`.

### Step 13: Manager Reviews Reopened Case
1. Switch to **Property Manager**.
2. Work order appears in the queue with the `Reopened` badge, ready for warranty re-dispatch.

---

## Demonstration of Grounded Policy RAG

1. Click **Ask Maintenance AI** in the navbar.
2. Ask: *"Who is responsible for fixing a leaking pipe under the sink?"*
   - **Response**: The assistant cites the approved document *"Grand Heights Resident Maintenance Responsibility Guide"*, confirming that management covers main lines while tenant negligence covers foreign object clogs.
   - Citations display chunk index and source document title.
3. Ask a question with **Insufficient Evidence**:
   - *"What is the warranty period for commercial solar panels on Building C?"*
   - **Response**: The assistant acknowledges: *"I couldn't find enough information in the available approved documents to answer this question."* (No hallucinated policies or warranties).
4. Ask about an **Emergency**:
   - *"I smell strong natural gas in my hallway and hear hissing!"*
   - **Response**: The assistant immediately activates the **Emergency Protocol banner**, providing the 911 instruction and direct 24/7 on-call dispatch phone `(555) 911-3000`.

---

## Authorization Security Verification

1. Attempting to query another resident's work order via the API directly returns `403 Forbidden` (`Access denied: resident not authorized for this work order`).
2. Attempting to access Grand Heights work orders while logged in as an Oakwood-only manager returns `403 Forbidden` (`Access denied: property outside authorized management scope`).
3. Attempting to view unassigned work orders as an unassigned technician returns `403 Forbidden`.
