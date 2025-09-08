### MDA Housing – Implementation Plan with Mini‑Milestones


## Objectives
- Build a data‑driven workflow system for plot/house/shop transfer aligned to roles: OWO, BCA, HOUSING, ACCOUNTS, WATER (optional), APPROVER, ADMIN.
- Persist workflow via Prisma schema (no enums), guarded transitions, and auditable state changes.
- Deliver MVP with secure local demo: intake → clearances → accounts → approval → post‑entries → close.


## Success Criteria (MVP)
- Seeded workflow tables (`WfStage`, `WfTransition`, `WfSection`, `WfStatus`, `WfSectionGroup`, `WfSectionGroupMember`).
- Endpoints operational with guard evaluations and transactionally consistent `AuditLog`.
- Next.js UI showing a case file, guard‑aware actions, and role consoles.
- PDF generation (Urdu compatible) for Intake Receipt, Clearances, Challan, Dispatch Memo, Transfer Deed.
- Files stored out of public web root with signed download routes.


## Technical Stack
- Backend: Node.js (Express), Prisma, PostgreSQL 16, JWT + RBAC, Zod validation, multer uploads, Puppeteer (PDF), MinIO/S3.
- Frontend: Next.js (App Router), React Hook Form, Zod, MUI/AntD, Noto Nastaliq Urdu.
- Security foundations: HTTPS (dev), input validation, CSRF, structured logging, optimistic concurrency, append‑only `AuditLog`.


## Deliverables
- Prisma schema with migrations and seeding scripts.
- Guard map implementation and generic transition handler.
- REST API set described in the brief.
- Next.js UI routes with guard‑driven actions.
- Document templates (HTML/Handlebars) + renderers.
- scope, env samples, README with runbook.


## Assumptions
- Single‑tenant system for demo; multi‑tenant not required.
- Minimal user directory with hardcoded demo users/roles for MVP.
Local Postgres and MinIO installed natively (no Docker) for the demo; can be swapped with containers later.


## Risks & Mitigations
- PDF Urdu font issues → embed Noto Nastaliq in templates; pre‑test headless fonts.
- Guard complexity → keep guard names stable; unit‑test each guard.
- Concurrency conflicts → use `If‑Match` with `updatedAt` and clear 409 UX.
- File security → never expose raw URLs; signed download endpoints only.


## Phase Plan and Timeline (Mini‑Milestones)

### Phase 0 – Project Scaffolding (0.5–1 day)
1. Initialize repo structure: backend, frontend, scripts, docs. (Completed)
2. Add basic tooling: ESLint/Prettier, tsconfig, nodemon, dotenv, Winston logger. (Completed)
3. Create `.env.example` for API, DB, MinIO, JWT, PDF. (Completed)
4. Set up Postgres + MinIO locally (native installs) for dev; document start/stop commands in README (no Docker in Phase 0). (Completed)

Milestone 0.1: Local Postgres/MinIO running; API boots and returns 200 on health. (Completed)


### Phase 1 – Data Model & Seed (1 day) ✅ COMPLETED
1. ✅ Implement Prisma schema exactly as specified (data‑driven lookups; no enums).
2. ✅ Create migrations.
3. ✅ Write seeding for:
   - `WfStatus`: CLEAR, OBJECTION, PENDING, PENDING_PAYMENT.
   - `WfSection`: BCA, HOUSING, ACCOUNTS, WATER.
   - `WfSectionGroup`: BCA_HOUSING, ACCOUNTS; with members.
   - `WfStage`: codes list and sort order.
   - `WfTransition`: edges with `guardName` per spec.
4. ✅ Seed demo `Person`, `Plot`.

Milestone 1.1: `prisma migrate dev` succeeds. ✅ COMPLETED (SQLite database created)
Milestone 1.2: `prisma db seed` populates lookups and demo rows. ✅ COMPLETED (All lookup tables and demo data seeded)


### Phase 2 – Backend Core (2 days)
1. ✅ Auth & RBAC: JWT middleware, role checks; demo users.
2. ✅ Validation: Zod schemas per endpoint; centralized error handler.
3. ✅ Guards: implement `GUARDS` map as per spec; unit tests for each.
4. ✅ Generic transition handler `/api/applications/:id/transition` with transaction + `AuditLog`.
5. ✅ Applications intake `POST /api/applications` with attachments (multer), S3/MinIO upload, receipt creation (async job OK, but record URL if ready).
6. ✅ Clearances `POST /api/applications/:id/clearances` with auto‑progress logic for BCA/Housing.
7. ✅ Accounts endpoints: upsert, verify‑payment (auto stage move, clearance to CLEAR).
8. ✅ Reviews endpoint: insert review rows and optional auto‑transition.
9. ✅ Deed endpoints: draft, finalize (hash + owner flip in same transaction).
10. ✅ Lookups endpoints including `transitions?from=<stage>` with dry‑run guards.


Milestone 2.1: ✅ All endpoints respond with mocked auth; Postman collection green.
Milestone 2.2: ✅ Guard unit tests pass; sample flow executes end‑to‑end via API.


### Phase 3 – Documents & Storage (1 day) ✅ COMPLETED
1. ✅ Handlebars templates for: Intake Receipt, BCA/Housing Clearance, Challan, Dispatch Memo, Transfer Deed.
2. ✅ PDF rendering with Puppeteer, font embedding, page headers/footers with QR.
3. ✅ Signed download routes; store only URLs + hashes in DB.
   - ✅ File system storage implementation (fallback for MinIO)
   - ✅ URL signing with HMAC-SHA256
   - ✅ Signature verification and expiration handling
   - ✅ Document generation and storage workflow
   - ✅ Database integration for document metadata
   - ✅ RESTful API endpoints for document management

Milestone 3.1: Each template renders with sample data and saves to MinIO. ✅ COMPLETED


### Phase 4 – Frontend (2–3 days)
1. ✅ Next.js app scaffolding; auth guard; role‑based navigation. (Completed)
2. ✅ `/applications/new`: intake form (Urdu/English), attachments grid with “Original seen”.
3. ✅ `/applications/[id]`: case file with tabs (Summary, Attachments, Clearances, Accounts, Deed, Audit).
4. Guard‑aware actions using `/workflow/transitions` to enable/disable buttons with reasons.
5. Consoles: `/console/bca`, `/console/housing`, `/console/accounts` with queues and actions.
6. `/console/approval`: deed capture and approve & lock.
7. Registers (read‑only) pages with filters and export.

Milestone 4.1: Create new application and navigate to case file.
Milestone 4.2: Full flow click‑through in UI moves stages correctly.

Phase 4.5 – Developer Dockerization (0.5 day; runs after Phase 4, before Phase 5)

Add docker-compose.dev.yml for Postgres 16 + MinIO with named volumes.

Provide .env.docker.example and overlay env loading in README.

Add Makefile targets: make up, make down, make logs, make psql, make mc.

Healthchecks for DB/MinIO; wait-for scripts in scripts/.

Ensure Prisma points to container DB via env; MinIO creds from env.

Milestone 4.5.D: docker compose -f docker-compose.dev.yml up brings DB/MinIO; API healthcheck 200.

### Phase 5 – Security Foundations (ongoing, 0.5–1 day)
1. CSRF protection for state‑changing routes (frontend + backend).
2. HTTPS for dev (self‑signed), secure cookies, security headers.
3. Upload restrictions (type/size), AV flags persisted.
4. Structured logging + request IDs; append‑only `AuditLog` trigger.

Milestone 5.1: Basic security checks pass; logs show transitions and user IDs.


### Phase 6 – QA, Demo Data, and Packaging (0.5–1 day)
1. Seed richer demo data (5–10 apps in different stages).
2. E2E walkthrough script; fix high‑priority issues.
3. README with run instructions, credentials, and caveats.

Milestone 6.1: Demo script runs in 15 minutes; team can operate the flow.


## Work Breakdown Summary
- Backend core (Phases 1–3): ~4 days.
- Frontend (Phase 4): ~2–3 days.
- Security, QA, packaging: ~1.5–2 days.
- Total MVP: ~7–9 working days.


## Start Here (Next Actionable Steps)
1. Phase 0 scaffolding and local Postgres/MinIO (no Docker).
2. Phase 1 Prisma schema + seed.
3. Verify transitions and guards with a Postman flow before UI.
4. After completing Phase 4 → run Phase 4.5 (Developer Dockerization) to enable the Dockerized dev stack.

## Post‑MVP (Phase‑2)
- RLS policies; KMS‑managed keys; PITR backups.
- Multi‑party applications (arrays of sellers/buyers).
- Deceased owner/legal heirs flow.
- Notifications (SMS/Email) for objections, payments, approvals.
- Containerized deployment with Nginx, CSP/HSTS, observability, rate limiting.


## Document Templates Mapping

- 1) درخواست برائے منتقلی پلاٹ امکان ارکان (Application + Intake Receipt)
  - Template files: `templates/intake/form-urdu.hbs` (Form #1), `templates/intake/receipt.hbs`
  - Prisma entities: `Application`, `Attachment[]`, `AuditLog`
  - Related docTypes: `AllotmentLetter` | `PrevTransferDeed` | `AttorneyDeed` | `GiftDeed` | `CNIC_Seller` | `CNIC_Buyer` | `CNIC_Attorney` | `UtilityBill_Latest` | `NOC_BuiltStructure` | `Photo_Seller` | `Photo_Buyer` | `PrevChallan` | `NOC_Water` (optional)
  - Generated when: `POST /api/applications` (receipt PDF after intake); stage moves to `SUBMITTED` → `UNDER_SCRUTINY`.

- 2) Clearance Certificate by BCA/Housing
  - Template file: `templates/clearance/clearance-bca-housing.hbs`
  - Prisma entities: `Clearance` (section=`BCA` or `HOUSING`), `WfSection`, `WfStatus`
  - Related docTypes: none (PDF stored as `Clearance.signedPdfUrl`)
  - Generated when: `POST /api/applications/:id/clearances` by section console; auto-progress to `BCA_HOUSING_CLEAR` or `ON_HOLD_BCA` per guard.

- 3) Clearance Certificate by Accounts (+ Challan)
  - Template files: `templates/accounts/challan.hbs`, `templates/accounts/clearance-accounts.hbs`
  - Prisma entities: `AccountsBreakdown`, `Clearance` (section=`ACCOUNTS`)
  - Related docTypes: none (PDF URLs stored in `AccountsBreakdown`-adjacent metadata or `Clearance.signedPdfUrl`)
  - Generated when: challan on `POST /api/applications/:id/accounts`; clearance on `POST /api/applications/:id/accounts/verify-payment`.

- 4) Dispatch Memo to Housing Officer
  - Template file: `templates/dispatch/memo.hbs`
  - Prisma entities: `Application`, `Attachment[]`, `Clearance[]`, `Review[]`
  - Related docTypes: lists attachments by their `Attachment.docType`
  - Generated when: Transition to `READY_FOR_APPROVAL` (guard: Accounts CLEAR + OWO review for `ACCOUNTS`).

- 5) Transfer Deed
  - Template file: `templates/deed/transfer-deed.hbs`
  - Prisma entities: `TransferDeed`, `Person` (witness1/2), `Application`, `Plot`
  - Related docTypes: optional `Photo_Witness1`, `Photo_Witness2` later
  - Generated when: Draft on `POST /api/applications/:id/transfer-deed/draft`; finalized on `.../finalize` (locks hash, captures signatures, updates ownership on APPROVED).

### Template Implementation Notes
- Fonts: Embed `Noto Nastaliq Urdu` subset; confirm metrics in headless Chromium.
- QR/Barcode: All PDFs include a QR linking to `/applications/[id]` packet.
- Localization: Keep Urdu text as provided; bind dynamic fields via Handlebars helpers.
- Storage: Render to MinIO/S3; persist only URLs and `hashSha256` (for deed final).
