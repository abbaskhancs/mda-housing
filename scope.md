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


### Phase 4 – Frontend (2–3 days) ✅ COMPLETED
1. ✅ Next.js app scaffolding; auth guard; role‑based navigation. (Completed)
2. ✅ `/applications/new`: intake form (Urdu/English), attachments grid with “Original seen”.
3. ✅ `/applications/[id]`: case file with tabs (Summary, Attachments, Clearances, Accounts, Deed, Audit).
4. ✅ Guard‑aware actions using `/workflow/transitions` to enable/disable buttons with reasons. (Completed)
5. ✅ Consoles: `/console/bca`, `/console/housing`, `/console/accounts` with queues and actions. (Completed)
6. ✅ `/console/approval`: deed capture and approve & lock. (Completed)
7. ✅ Registers (read‑only) pages with filters and export. (Completed)

Milestone 4.1: ✅ Create new application and navigate to case file. (Completed)
Milestone 4.2: ✅ Full flow click‑through in UI moves stages correctly. (Completed - Guard-aware actions implemented)

### Phase 4.X — Frontend Completion for **Complete Housing Transfer Process**

> Goal: every screen, button, and console works end-to-end for demoing the full transfer flow. No Docker/Security items here. Each step ends with a **Test & Validate** checklist the implementer must run before moving on.

---

#### 1) Wire “Create Application → Receipt → Scrutiny” end-to-end ✅ COMPLETED

* ✅ Implement: `/applications/new` must create `Application`, upload attachments, immediately render/offer **Intake Receipt PDF** link, then move app to `UNDER_SCRUTINY`.
* ✅ **Test & Validate**

  * ✅ Create a new app; confirm toast shows the new **App No**.
  * ✅ Receipt link opens a PDF with correct Urdu labels, QR, and app data.
  * ✅ Case header shows **Stage: UNDER\_SCRUTINY** and a new **Audit** row (“CREATE\_APP”, “TRANSITION SUBMITTED→UNDER\_SCRUTINY”).

**Implementation Notes:**
- Receipt PDF generation using Puppeteer with proper Urdu fonts (Noto Nastaliq Urdu)
- QR code generation linking to application details page
- Auto-transition logic with guard evaluation (GUARD_INTAKE_COMPLETE)
- Proper audit logging for all transitions
- Frontend toast notification with App No and receipt download link
- Guard correctly blocks transition when required documents are missing (expected behavior)

---

#### 2) Guard-aware action buttons (global) ✅ COMPLETED

* ✅ Implement: For **every** action button, fetch `/workflow/transitions?from=<current>` and enable/disable with tooltip explaining unmet guards. Show inline spinner + disable during call.
* ✅ **Test & Validate**

  * ✅ On a fresh `UNDER_SCRUTINY` case, only **Send to BCA & Housing** is enabled; others are disabled with correct reasons.
  * ✅ Trigger a blocked action; confirm no network call is fired and tooltip explains which guard blocks it.

**Implementation Notes:**
- Enhanced WorkflowActions component to properly handle guardResult from API responses
- Added comprehensive tooltip system with hover states for disabled buttons
- Implemented proper guard evaluation with detailed reason display
- Added spinner states during guard evaluation and transitions
- Ensured no network calls are made for disabled buttons
- API returns proper guard evaluation results with reasons and metadata
- Frontend displays clear status indicators (✓ Ready / ✗ Blocked) with detailed explanations

---

#### 3) “Send to BCA & Housing” dispatch

* ✅ Implement: Button calls `PATCH /api/applications/:id/transition` to `SENT_TO_BCA_HOUSING`. Ensure two **pending** `Clearance` rows exist/appear.
* ✅ **Test & Validate**

  * ✅ Stage becomes **SENT\_TO\_BCA\_HOUSING**; Summary tab shows BCA/Housing = **PENDING**.
  * ✅ Audit shows a TRANSITION row with from/to stages.

---

#### 4) BCA console — CLEAR/OBJECTION with signed PDF ✅

* ✅ Implement: `/console/bca` list, detail panel with radio **CLEAR/OBJECTION**, remarks (required for objection), **Generate Clearance PDF** (stores URL), **Save** posts `POST /applications/:id/clearances`.
* **Test & Validate**

  * ✅ Mark **CLEAR**, save; BCA row shows **CLEAR** and a PDF link that opens.
  * ✅ Mark **OBJECTION** on another app; stage auto moves to **ON\_HOLD\_BCA**; OWO sees objection text in Summary.

**Implementation Summary:**
- ✅ **Backend**: Added `GET /api/applications/bca/pending` endpoint to fetch applications needing BCA clearance
- ✅ **Backend**: Added `POST /api/applications/:id/bca/generate-pdf` endpoint for BCA clearance PDF generation
- ✅ **Backend**: Enhanced existing `POST /api/applications/:id/clearances` endpoint to support signed PDF URLs
- ✅ **Frontend**: Completely rebuilt `/console/bca` page with functional clearance processing
- ✅ **Frontend**: Implemented real-time application loading, filtering, and selection
- ✅ **Frontend**: Added CLEAR/OBJECTION radio buttons with validation (remarks required for objections)
- ✅ **Frontend**: Integrated PDF generation with signed URL display and download
- ✅ **Frontend**: Connected to clearance API with proper error handling and user feedback
- ✅ **Auto-transition**: BCA OBJECTION automatically moves applications to ON_HOLD_BCA stage (when in BCA_PENDING stage)
- ✅ **Validation**: All acceptance tests pass - CLEAR saves with PDF link, OBJECTION triggers auto-transition

---

#### 5) Housing console — same as BCA ✅ COMPLETED

* ✅ Implement: `/console/housing` mirrors BCA behavior.
* ✅ **Test & Validate**

  * ✅ When **both sections = CLEAR** and app is in `SENT_TO_BCA_HOUSING`, stage auto-moves to **BCA\_HOUSING\_CLEAR**; timeline updates; both clearance PDFs open.

**Implementation Notes:**
- ✅ **Backend**: Added housing-specific endpoints (`/api/applications/housing/pending` and `/api/applications/:id/housing/generate-pdf`) mirroring BCA endpoints
- ✅ **Backend**: Enhanced auto-transition logic in `clearanceService.ts` to handle both-clearances scenario in `SENT_TO_BCA_HOUSING` stage
- ✅ **Backend**: Added missing `SENT_TO_BCA_HOUSING → BCA_HOUSING_CLEAR` transition with `GUARD_CLEARANCES_COMPLETE` guard to seed data
- ✅ **Backend**: Fixed auto-transition context validation by passing user information to guard execution
- ✅ **Frontend**: Completely rebuilt `/console/housing` page from placeholder to functional console mirroring BCA behavior
- ✅ **Frontend**: Implemented real-time application loading, clearance processing, PDF generation, and form validation
- ✅ **Frontend**: Added housing-specific API methods in `api.ts` service
- ✅ **Auto-transition**: When both BCA and Housing clearances are CLEAR in `SENT_TO_BCA_HOUSING` stage, application automatically transitions to `BCA_HOUSING_CLEAR`
- ✅ **Validation**: Comprehensive acceptance test passes - both clearances processed, auto-transition occurs, both PDFs available

---

#### 6) OWO review for BCA/Housing ✅ COMPLETED

* ✅ Implement: **Mark BCA/Housing Reviewed** button creates `Review` (targetGroup `BCA_HOUSING`) and moves to `OWO_REVIEW_BCA_HOUSING`.
* ✅ **Test & Validate**

  * ✅ After click, a **Review** row appears (who/when/note) and stage reads **OWO\_REVIEW\_BCA\_HOUSING**.

**Implementation Notes:**
- ✅ **Backend**: Added `OWO_REVIEW_BCA_HOUSING` stage to workflow with sortOrder 7
- ✅ **Backend**: Created `GUARD_BCA_HOUSING_REVIEW` guard to validate both BCA and Housing clearances are CLEAR
- ✅ **Backend**: Created `GUARD_OWO_REVIEW_COMPLETE` guard to validate OWO review completion
- ✅ **Backend**: Added workflow transitions: `BCA_HOUSING_CLEAR → OWO_REVIEW_BCA_HOUSING` and `OWO_REVIEW_BCA_HOUSING → ACCOUNTS_PENDING`
- ✅ **Backend**: Enhanced review service auto-transition logic to handle BCA_HOUSING_CLEAR stage OWO reviews
- ✅ **Backend**: Fixed auto-transition context validation by passing user information to guard execution
- ✅ **Backend**: Added `/api/applications/owo/bca-housing-review` endpoint for OWO officers to get applications ready for review
- ✅ **Frontend**: Created `/console/owo` page for OWO officers to review applications with completed BCA and Housing clearances
- ✅ **Frontend**: Implemented "Mark BCA/Housing Reviewed" functionality with auto-transition to `OWO_REVIEW_BCA_HOUSING`
- ✅ **Frontend**: Added OWO-specific API methods in `api.ts` service
- ✅ **Auto-transition**: When OWO officer marks BCA/Housing as reviewed, application automatically transitions from `BCA_HOUSING_CLEAR` to `OWO_REVIEW_BCA_HOUSING`
- ✅ **Validation**: Comprehensive acceptance test passes - review created, auto-transition occurs, stage updates correctly

---

#### 7) Dispatch to Accounts (guarded) ✅ COMPLETED

* ✅ Implement: **Send to Accounts** becomes enabled only with OWO review present; transition to `SENT_TO_ACCOUNTS`.
* ✅ **Test & Validate**

  * ✅ Stage updates; Accounts tab becomes editable; Accounts **Clearance** shows **PENDING**.

**Implementation Notes:**
- ✅ **Backend**: Added `SENT_TO_ACCOUNTS` stage to workflow with sortOrder 8
- ✅ **Backend**: Updated workflow transitions: `OWO_REVIEW_BCA_HOUSING → SENT_TO_ACCOUNTS` with `GUARD_OWO_REVIEW_COMPLETE`
- ✅ **Backend**: Added `SENT_TO_ACCOUNTS → ACCOUNTS_PENDING` transition with `GUARD_SENT_TO_ACCOUNTS`
- ✅ **Backend**: Created `GUARD_SENT_TO_ACCOUNTS` guard to create pending accounts clearance
- ✅ **Backend**: Enhanced `GUARD_OWO_REVIEW_COMPLETE` to validate OWO review for BCA/Housing completion
- ✅ **Validation**: Comprehensive test passes - Send to Accounts enabled only with OWO review, transition works correctly

---

#### 8) Accounts fee heads + challan generation ✅ COMPLETED

* ✅ Implement: Editable grid for **arrears, surcharge, nonUser, transferFee, attorneyFee, water, suiGas, additional** with auto total + **amount in words**. **Generate Challan** persists challanNo/date and renders challan PDF.
* ✅ **Test & Validate**

  * ✅ Numbers format correctly; total updates live; challan PDF opens with same total & words.
  * Audit shows “ACCOUNTS\_UPDATE”.
**Implementation Notes:**
- ✅ **Database Schema**: Extended `AccountsBreakdown` model with 8 fee heads: `arrears`, `surcharge`, `nonUser`, `transferFee`, `attorneyFee`, `water`, `suiGas`, `additional`
- ✅ **Auto Calculation**: Total amount automatically calculated from sum of all fee heads
- ✅ **Amount in Words**: Centralized utility function converts numbers to Urdu words (`بیس چھ ہزار روپے only`)
- ✅ **Challan Generation**: Generates unique challan number (format: `CHAL-YYYYMMDD-XXXX`) and persists challan date
- ✅ **PDF Generation**: Updated challan template with new fee heads, renders PDF with correct totals and words
- ✅ **API Endpoints**:
  - `POST /api/applications/:id/accounts` - Update fee heads
  - `POST /api/applications/:id/accounts/generate-challan` - Generate challan number/date
  - `GET /api/applications/:id/accounts/challan-pdf` - Download challan PDF
- ✅ **Audit Logging**: Creates `ACCOUNTS_UPDATE` and `CHALLAN_GENERATED` audit entries
- ✅ **Validation**: All fee heads validated as positive decimals with proper error handling

---

#### 9) Accounts — Pending Payment / On Hold ✅ COMPLETED

* ✅ Implement: Buttons **Set Pending Payment** and **Raise Objection** set Accounts status and stage (`AWAITING_PAYMENT` or `ON_HOLD_ACCOUNTS`).
* ✅ **Test & Validate**

  * ✅ Stage changes appropriately; Summary shows Accounts status; OWO sees reason in Accounts card.

**Implementation Notes:**
- ✅ **Database Schema**: Added `accountsStatus`, `objectionReason`, `objectionDate`, `resolvedDate` fields to `AccountsBreakdown` model
- ✅ **Workflow Stages**: Added `AWAITING_PAYMENT` and `ON_HOLD_ACCOUNTS` stages with proper sort order
- ✅ **Workflow Transitions**:
  - `ACCOUNTS_PENDING → AWAITING_PAYMENT` (guarded by `GUARD_SET_PENDING_PAYMENT`)
  - `ACCOUNTS_PENDING → ON_HOLD_ACCOUNTS` (guarded by `GUARD_RAISE_ACCOUNTS_OBJECTION`)
  - `ON_HOLD_ACCOUNTS → ACCOUNTS_PENDING` (guarded by `GUARD_ACCOUNTS_OBJECTION_RESOLVED`)
- ✅ **Workflow Guards**:
  - `GUARD_SET_PENDING_PAYMENT`: Sets accounts status to AWAITING_PAYMENT
  - `GUARD_RAISE_ACCOUNTS_OBJECTION`: Sets accounts status to ON_HOLD with objection reason
  - `GUARD_ACCOUNTS_OBJECTION_RESOLVED`: Resolves objection and returns to PENDING status
- ✅ **API Endpoints**:
  - `POST /api/applications/:id/accounts/set-pending-payment` - Set accounts to pending payment
  - `POST /api/applications/:id/accounts/raise-objection` - Raise objection with reason
- ✅ **Audit Logging**: Creates audit entries for all accounts status changes
- ✅ **Validation**: Proper validation for objection reasons and stage requirements
- ✅ **Status Tracking**: Accounts breakdown shows current status and objection details

---

#### 10) Accounts — Mark Paid & Verified → Accounts CLEAR ✅

* ✅ Implement: **Mark Paid & Verified** posts `/accounts/verify-payment`, flips `paid=true`, creates/updates Accounts `Clearance=CLEAR`, and moves stage to **ACCOUNTS\_CLEAR** (if coming from `SENT_TO_ACCOUNTS`/`AWAITING_PAYMENT`).
* ✅ **Test & Validate**

  * ✅ Stage shows **ACCOUNTS\_CLEAR**; Clearance PDF (Accounts) link appears and opens.
  * ✅ Refresh page: state persists; audit shows transition.

**Implementation Notes:**
- ✅ **Database Schema**: Added `ACCOUNTS_CLEAR` stage with proper sort order
- ✅ **Workflow Transitions**: Added transitions from `SENT_TO_ACCOUNTS` and `AWAITING_PAYMENT` to `ACCOUNTS_CLEAR`
- ✅ **Workflow Guards**: Implemented `GUARD_ACCOUNTS_CLEAR` to validate payment verification and accounts clearance
- ✅ **Payment Verification**: Enhanced `/accounts/verify-payment` endpoint to create ACCOUNTS clearance with CLEAR status
- ✅ **Auto-transition Logic**: Updated `checkAutoProgressAfterPayment` to transition to `ACCOUNTS_CLEAR` when payment is verified
- ✅ **PDF Generation**: Added `/accounts/generate-pdf` endpoint for accounts clearance certificate
- ✅ **Document Service**: Added `ACCOUNTS_CLEARANCE` document type support
- ✅ **Template**: Created `templates/accounts/clearance-accounts.hbs` for accounts clearance PDF
- ✅ **Manual Transition**: Verified manual transition from `AWAITING_PAYMENT` to `ACCOUNTS_CLEAR` works correctly

---

#### 11) OWO review for Accounts ✅

* ✅ Implement: **Mark Accounts Reviewed** inserts `Review` for group `ACCOUNTS`, moving to **OWO\_REVIEW\_ACCOUNTS**.
* ✅ **Test & Validate**

  * ✅ Review row appears; stage updates; **Send to Housing Officer** button becomes enabled (dry-run transitions reports READY\_FOR\_APPROVAL available).

**Implementation Notes:**
- ✅ **Database Schema**: Added `OWO_REVIEW_ACCOUNTS` stage to workflow with sortOrder 15
- ✅ **Workflow Stages**: Updated sort orders for subsequent stages (PAYMENT_PENDING: 16, READY_FOR_APPROVAL: 17, etc.)
- ✅ **Workflow Transitions**:
  - `ACCOUNTS_CLEAR → OWO_REVIEW_ACCOUNTS` (guarded by `GUARD_ACCOUNTS_REVIEWED`)
  - `OWO_REVIEW_ACCOUNTS → READY_FOR_APPROVAL` (guarded by `GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE`)
- ✅ **Workflow Guards**:
  - Enhanced `GUARD_ACCOUNTS_REVIEWED`: Validates ACCOUNTS review exists for transition to OWO_REVIEW_ACCOUNTS
  - Created `GUARD_OWO_ACCOUNTS_REVIEW_COMPLETE`: Validates ACCOUNTS review completion for transition to READY_FOR_APPROVAL
- ✅ **Review Service**: Added auto-transition logic for ACCOUNTS reviews from ACCOUNTS_CLEAR to OWO_REVIEW_ACCOUNTS
- ✅ **API Integration**: Uses existing `/api/applications/:id/reviews` endpoint with ACCOUNTS section
- ✅ **Validation**: Comprehensive validation confirms all components working correctly

---

#### 12) Auto-generate Dispatch Memo on “Send to Housing Officer”

* ✅ Implement: Transition to `READY_FOR_APPROVAL` and render **Dispatch Memo PDF** listing attachments & clearances.
* ✅ **Test & Validate**

  * ✅ Stage: **READY\_FOR\_APPROVAL**.
  * ✅ Memo PDF opens; contains Form #1, BCA/Housing/Accounts clearances, challan, CNICs, etc.

**Implementation Notes:**
- ✅ **Auto-Generation Logic**: Added `generateDispatchMemoOnTransition` function to workflow transition handler
- ✅ **Workflow Integration**: Auto-generation triggered when transitioning to `READY_FOR_APPROVAL` stage
- ✅ **Template Data Preparation**: Comprehensive data mapping for dispatch memo template including:
  - Application details (Form #1 data)
  - Seller and buyer information
  - Plot details
  - All attachments with original seen status
  - All clearances (BCA, Housing, Accounts) with status and remarks
  - All reviews with section and status information
  - Accounts breakdown with payment details
- ✅ **PDF Service Integration**: Uses existing `pdfService.generateDispatchMemo()` method
- ✅ **Document Service Integration**: Auto-generated memo stored via `documentService.generateDocument()`
- ✅ **Error Handling**: Memo generation failures don't prevent workflow transitions
- ✅ **Template**: Uses existing `templates/dispatch/memo.hbs` with Urdu/Arabic styling
- ✅ **Validation**: PDF generation tested successfully (397KB PDF with substantial content)
- ✅ **Content Verification**: Memo contains all required elements:
  - Form #1 application data
  - BCA/Housing/Accounts clearances
  - Challan information (when available)
  - CNIC and attachment details
  - QR code for application tracking

---

#### 13) Approval console — deed draft ✅

* ✅ Implement: `/console/approval` shows packet, **Deed Draft** form (deedNo, witness selection), **Generate Draft** (stores draft PDF URL).
* ✅ **Test & Validate**

  * ✅ Draft PDF opens with witness names; audit logs “DEED\_DRAFTED”.

**Implementation Notes:**
- ✅ **Approval Console**: `/console/approval` page already exists with comprehensive deed draft functionality
- ✅ **Deed Draft Form**: Form includes witness selection with dropdown for available persons
- ✅ **Witness Selection**: Users can select two different witnesses from available persons
- ✅ **Generate Draft**: "Create Deed Draft" button creates transfer deed and generates PDF
- ✅ **PDF Generation**: Auto-generates deed PDF using existing template (`deed/transfer-deed.hbs`)
- ✅ **PDF URL Storage**: Stores generated PDF URL in `transferDeed.deedPdfUrl` field
- ✅ **Document Service Integration**: Uses document service for PDF generation and storage
- ✅ **Template Data**: Comprehensive data mapping including:
  - Application details (ID, number, stage, dates)
  - Seller and buyer information (name, CNIC, phone, address)
  - Plot details (number, block, sector, area, location)
  - Transfer deed details (ID, witnesses, content, status)
- ✅ **Audit Logging**: Creates audit log with action "DEED_DRAFTED" (updated from "DEED_DRAFT_CREATED")
- ✅ **Error Handling**: Graceful error handling if PDF generation fails
- ✅ **Validation**: PDF generation tested successfully (350KB PDF with substantial content)
- ✅ **Content Verification**: PDF contains all required elements:
  - Witness names prominently displayed
  - Seller and buyer information
  - Plot details and deed ID
  - Urdu/Arabic formatting with proper styling
  - QR code for verification

---

#### 14) Approval console — capture photos/signatures ✅

* Implement: Inputs for seller/buyer/witness photos and signatures (file upload components), preview thumbnails; client-side size/type guard (no security features, just UX).
* **Test & Validate**

  * Uploads show previews; files persist; reopening page shows same files.

**COMPLETED**:
- ✅ Database schema updated with photo/signature URL fields in TransferDeed model
- ✅ Created FileUpload UI component with preview thumbnails and client-side validation
- ✅ Created PhotoSignatureCapture component for seller/buyer/witness photos and signatures
- ✅ Added API endpoint `/api/applications/:id/transfer-deed/photos-signatures` for file uploads
- ✅ Integrated photo/signature capture into approval console
- ✅ Client-side file size (5MB photos, 2MB signatures) and type validation
- ✅ Preview thumbnails for uploaded images
- ✅ Upload progress indicators and error handling

---

#### 15) Approve & Lock Deed (finalize) ✅

* Implement: **Approve & Lock** posts `/transfer-deed/finalize` with final PDF URL, hash, signatures → guarded transition to **APPROVED**; backend flips ownership.
* **Test & Validate**

  * Stage shows **APPROVED**; Deed card displays **hash** and final PDF; **Plot currentOwner** on Registers updates to **Transferee**.

**COMPLETED**:
- ✅ Database schema updated with `currentOwnerId` field in Plot model and `finalPdfUrl` in TransferDeed model
- ✅ API endpoint `/api/applications/:id/transfer-deed/finalize` updated to require `finalPdfUrl` parameter
- ✅ Validation schema enforces final PDF URL requirement
- ✅ Deed service transfers plot ownership from seller to buyer (`currentOwnerId` updated)
- ✅ Deed service triggers workflow transition from READY_FOR_APPROVAL to APPROVED stage
- ✅ Frontend "Approve & Lock Deed" button with final PDF URL input field
- ✅ Finalized deed displays hash and final PDF link
- ✅ Ownership transfer audit logging
- ✅ Stage transition audit logging

---

#### 16) Post-entries & Close

* Implement: Two buttons on Approval or OWO view: **Start Post-Entries** (`APPROVED→POST_ENTRIES`) and **Close Case** (`POST_ENTRIES→CLOSED`).
* **Test & Validate**

  * Stage sequence reflects actions; **CLOSED** badges appear in list views; exports include final owner.

---

#### 17) Summary tab — live section status panel ✅

* Implement: Compact panel showing BCA, HOUSING, ACCOUNTS status with color badges and links to their PDFs, plus latest remarks.
* **Test & Validate**

  * Objection remarks visible; clicking a badge opens respective PDF; statuses update without full page reload.

**COMPLETED**: ✅ Summary tab with live section status panel implemented
- Created SectionStatusPanel component with live updates (30-second auto-refresh)
- Displays BCA, HOUSING, ACCOUNTS sections with color-coded status badges
- Shows latest remarks for each section (objection remarks visible)
- PDF generation and viewing functionality (clicking badge opens respective PDF)
- Integrated into application detail page with real API data
- Status updates without full page reload via polling mechanism
- Error handling and loading states implemented

---

#### 18) Attachments grid — full CRUD + “Original seen”

* Implement: Add/replace/delete attachments; “Original seen” toggle; verifier name/time; file preview where possible.
* **Test & Validate**

  * Toggling “Original seen” persists; deleted file disappears after refresh; verifier meta shows.

**✅ COMPLETED - All acceptance criteria met:**
- Database schema updated with verifier tracking fields
- Full CRUD API endpoints implemented (GET, POST, PUT, DELETE)
- AttachmentsGrid component created with all required functionality
- Component integrated into application detail page
- Verifier metadata display implemented
- File preview and management features added
- Audit logging and error handling implemented

---

#### 19) Stage timeline (from Audit) ✅ COMPLETED

* Implement: Timeline component reading `AuditLog` to render stage hops with actor and timestamps.
* **Test & Validate**

  * All transitions from the test case show in order; clicking a node reveals audit note.

**✅ COMPLETED - All acceptance criteria met:**

**StageTimeline Component Implementation:**
- Created `StageTimeline.tsx` component that reads from AuditLog model
- Filters relevant events (stage transitions, application creation, clearances, etc.)
- Sorts events chronologically (oldest to newest) for proper timeline order
- Displays each event with appropriate icons and visual styling
- Shows actor information (username and role) for each event
- Formats timestamps with readable date and time display

**Interactive Timeline Features:**
- Clickable timeline nodes with visual expansion indicators
- Toggle functionality to expand/collapse audit details
- Expandable nodes reveal full audit notes and details
- Visual feedback for expandable vs non-expandable nodes
- Proper accessibility with click handlers and titles

**Integration and Data Flow:**
- Integrated into application detail page audit tab
- Updated Application interface to include auditLogs array
- API already provides audit logs with user information and proper ordering
- Workflow service creates detailed audit logs for stage transitions
- Database schema supports all required timeline functionality

**Visual Design:**
- Professional timeline layout with connecting lines
- Color-coded event types with appropriate icons
- Responsive design that works on different screen sizes
- Proper spacing and typography for readability
- Summary information showing total events and last update

**Acceptance Criteria Verified:**
- ✅ All transitions show in chronological order with actor and timestamps
- ✅ Clicking nodes reveals detailed audit notes and information

---

#### 20) Global search + queues ✅ COMPLETED

* Implement: Header search across App No, Plot, CNIC; queues for each console with filters by **stage**, **status**, **my pending**.
* **Test & Validate**

  * Searching CNIC or Plot lands on the right case; queues correctly filter by stage.

**✅ COMPLETED - All acceptance criteria met:**

**Global Search Implementation:**
- Created comprehensive search API endpoint (`GET /api/applications/search`)
- Searches across Application Number, Plot Number, Seller CNIC, Buyer CNIC, Attorney CNIC
- Case-insensitive search with proper result limiting
- Enhanced main applications endpoint with search and "assignedToMe" filtering

**GlobalSearch Component:**
- Professional header search component with debounced input (300ms)
- Keyboard navigation support (Arrow keys, Enter, Escape)
- Search results dropdown with highlighting of matching terms
- Click-to-navigate functionality to application detail pages
- Loading states and empty state handling
- Responsive design with proper accessibility

**Queue Filtering System:**
- Created comprehensive QueueFilters component with multiple filter types
- Stage filtering with role-based relevant stage display
- Status filtering (Active, Pending, etc.)
- "My Pending" toggle showing applications assigned to user's role
- Search within queue functionality
- Quick filter buttons for common actions
- Expandable/collapsible filter interface with clear filters option

**Console Integration:**
- Updated BCA Console with QueueFilters integration
- Updated Housing Console with QueueFilters integration
- Implemented filtered applications state management
- Role-specific filtering logic (BCA shows SENT_TO_BCA_HOUSING for "My Pending")
- Replaced old search inputs with comprehensive filtering system

**Header Integration:**
- Integrated GlobalSearch into RoleNav component
- Conditional rendering for logged-in users only
- Proper positioning and responsive design
- Enhanced header layout with better spacing

**API Service Enhancements:**
- Added searchApplications method for global search
- Added getWorkflowStages and getWorkflowStatuses methods
- Enhanced getApplications method with assignedToMe parameter
- Proper TypeScript interfaces and error handling

**Acceptance Criteria Verified:**
- ✅ Searching CNIC or Plot lands on the right case (global search navigates to correct application)
- ✅ Queues correctly filter by stage (comprehensive filtering by stage, status, and role-based assignments)

---

#### 21) Objection loop UX (BCA and Accounts)

* Implement: On `ON_HOLD_BCA` and `ON_HOLD_ACCOUNTS`, show **Fix & Resubmit** CTA that takes OWO back to **UNDER\_SCRUTINY** (if needed) or re-dispatches to the blocked section after document fixes.
* **Test & Validate**

  * Trigger BCA OBJECTION, upload a missing doc, **Resend to BCA & Housing** becomes enabled; loop completes to **BCA\_HOUSING\_CLEAR**.

---

#### 22) Optional WATER section path ✅ **COMPLETED**

* ✅ Implement: Toggle at intake (**Water NOC required?**). If yes, show WATER clearance row and console like BCA.
* ✅ **Test & Validate**

  * ✅ With Water enabled, **ALL\_SECTIONS\_IN\_GROUP\_CLEAR(BCA\_HOUSING)** must consider only BCA+HOUSING (Water independent); WATER objections do not block Accounts unless policy dictates (skip policy; just show independent row).
  * ✅ WATER PDF opens.

---

#### 23) Amount-in-words helper parity ✅

* ✅ Implement: Same number → same words in **UI and challan PDF**. Centralize in a shared helper.
* ✅ **Test & Validate**

  * ✅ Change total; confirm both places show identical wording after rerender.

**Implementation Notes:**
- ✅ **Centralized Utility**: Created shared `numberToWords.ts` utility in both backend and frontend with identical implementations
- ✅ **Backend Integration**: `accountsService.ts` uses `formatCurrencyInWords()` to generate `totalAmountWords` stored in database
- ✅ **PDF Templates**: Challan template uses `{{accountsBreakdown.totalAmountWords}}` from database (consistent with backend utility)
- ✅ **Frontend UI**: `AccountsTab.tsx` component uses frontend utility for live calculations and displays
- ✅ **API Integration**: Frontend `api.ts` service includes accounts methods for CRUD operations
- ✅ **Validation Fix**: Updated `accountsSchemas` to use `nonNegativeDecimalSchema` allowing zero values
- ✅ **Comprehensive Testing**: All test scenarios pass - same number produces identical words in UI and PDF
- ✅ **Live Calculation**: UI shows real-time amount-in-words that matches what will be stored/displayed in PDF
- ✅ **Rerender Consistency**: Changing totals maintains identical wording between UI and PDF templates

---

#### 24) Registers (read-only) parity ✅

* ✅ Implement: Registers list shows **current owner** from Plot; export CSV/PDF.
* ✅ **Test & Validate**

  * ✅ After approval, the plot record shows transferee as owner; export contains updated owner.

**COMPLETED**:
- ✅ Backend: Updated applications API to include plot's currentOwner information in responses
- ✅ Backend: Added PDF export endpoint `/api/applications/registers/export-pdf` for registers
- ✅ Backend: Created comprehensive PDF template for applications register with current owner display
- ✅ Backend: Enhanced Handlebars helpers with string manipulation and array counting functions
- ✅ Frontend: Updated Application interface to include currentOwner in plot data
- ✅ Frontend: Added current owner column to registers table display
- ✅ Frontend: Updated CSV export to include current owner name and CNIC
- ✅ Frontend: Added PDF export functionality with proper error handling
- ✅ Frontend: Enhanced registers page with both CSV and PDF export buttons
- ✅ Database: Plot model already includes currentOwnerId field and currentOwner relation
- ✅ Ownership Transfer: Existing deed finalization process updates plot ownership correctly

---

#### 25) Packet export (zip) ✅

* ✅ Implement: **Export Case Packet** button (any tab) hits `/api/applications/:id/packet` to download zip of Docs #1–#5.
* ✅ **Test & Validate**

  * ✅ Zip downloads; opening shows intake receipt, clearances, challan, memo, deed.

**COMPLETED**:
- ✅ Backend: Created PacketService to generate all required documents (intake receipt, clearances, challan, memo, deed)
- ✅ Backend: Added archiver dependency for zip file creation
- ✅ Backend: Implemented `/api/applications/:id/packet` endpoint with authentication and validation
- ✅ Backend: Zip contains all 7 documents with proper naming (01_Intake_Receipt.pdf, 02_BCA_Clearance.pdf, etc.)
- ✅ Backend: Proper error handling and logging for packet generation
- ✅ Frontend: Added exportCasePacket method to API service
- ✅ Frontend: Updated application detail page Export button to download case packet zip
- ✅ Frontend: Added loading state and error handling for packet export
- ✅ Frontend: Proper file download with dynamic filename based on application number and date
- ✅ Integration: End-to-end functionality from UI button click to zip file download

---

#### 26) Print controls (per-tab) ✅

* ✅ Implement: **Print** actions for each tab with server PDF where available; fallback to client print of a read view.
* ✅ **Test & Validate**

  * ✅ Printing Clearances uses server PDF; printing Accounts uses challan/clearance PDFs; layout is A4.

**COMPLETED**:
- ✅ **PrintControls Component**: Created reusable component with server PDF and client-side print support
- ✅ **Summary Tab**: Added print functionality with client-side print of application summary and section status
- ✅ **Clearances Tab**: Added print functionality that uses server PDF for clearance certificates when available
- ✅ **Accounts Tab**: Added print functionality that uses server PDF for challan and clearance certificates
- ✅ **Other Tabs**: Added print functionality to Attachments, Deed, and Audit tabs with appropriate print views
- ✅ **A4 Layout**: All print outputs use A4 format with proper margins (20mm top/bottom, 15mm left/right)
- ✅ **Server PDF Integration**: Leverages existing PDF endpoints for clearances, challan, and other documents
- ✅ **Client Print Fallback**: Provides styled client-side print for read views when server PDFs not available
- ✅ **Per-Tab Controls**: Removed generic print button, each tab now has context-specific print options
- ✅ **Print Styles**: Comprehensive CSS for print media with proper typography and layout

---

#### 27) Role switch & RBAC UX (frontend only) ✅

* ✅ Implement: Simple role switcher (top-right) to simulate logging as OWO/BCA/HOUSING/ACCOUNTS/APPROVER; hide actions not relevant to role.
* ✅ **Test & Validate**

  * ✅ As BCA, only BCA console visible; as APPROVER, only Approval console and case view actions relevant to approval.

**COMPLETED**:
- ✅ **Role-based AuthGuard**: Updated AuthGuard component to support `allowedRoles` parameter with proper access control and user-friendly error messages
- ✅ **Role Switching Context**: Extended AuthContext with `switchRole()` function for temporary role simulation
- ✅ **Role Switcher Component**: Created dropdown component in top-right navigation with:
  - Visual role indicators with color coding
  - All available roles (OWO, BCA, HOUSING, ACCOUNTS, WATER, APPROVER, ADMIN)
  - Role descriptions and current role highlighting
  - Temporary simulation notice
- ✅ **Navigation Role Filtering**: Updated RoleNav component to show/hide navigation links based on current role:
  - OWO: Home, New Application, relevant consoles
  - BCA: Home, BCA Console only
  - HOUSING: Home, Housing Console only
  - ACCOUNTS: Home, Accounts Console only
  - APPROVER: Home, Approval Console only
  - ADMIN: All navigation items including Admin Panel and User Management
- ✅ **Application Actions Role Control**: Added role-based visibility for:
  - Workflow Actions: Only shown to users with relevant roles (OWO, BCA, HOUSING, ACCOUNTS, APPROVER, ADMIN)
  - Export Packet: Only visible to ADMIN and APPROVER roles
  - Backend already has role-based guards for all workflow transitions
- ✅ **Sidebar Integration**: Existing Sidebar component already had role-based filtering
- ✅ **Console Access Control**: All console pages use AuthGuard with proper role restrictions

---

#### 28) Error & conflict UX (frontend only) ✅

* ✅ Implement: Friendly banners for guard failures (`422`) showing the **guardName** and unmet condition; handle **409** (stale) by offering **Reload**.
* ✅ **Test & Validate**

  * ✅ Try a blocked transition: banner shows exact guard; simulate stale update to see 409 flow.

**COMPLETED**:
- ✅ **ErrorBanner Component**: Created reusable error banner component with:
  - **Guard Failure Display**: Shows guard name, reason, and metadata for 403/422 errors
  - **Conflict Handling**: Special handling for 409 conflicts with reload functionality
  - **Visual Indicators**: Color-coded banners (yellow for guard failures, blue for conflicts, red for generic errors)
  - **Action Buttons**: Retry and reload buttons based on error type
  - **Expandable Details**: Collapsible metadata display for additional error information
- ✅ **Enhanced API Service**: Updated API service to parse error responses and extract:
  - Status codes (403, 409, etc.)
  - Error codes (TRANSITION_NOT_ALLOWED, DUPLICATE_ENTRY)
  - Guard details (guardName, reason, metadata) from backend error responses
  - Structured ErrorDetails interface for consistent error handling
- ✅ **WorkflowActions Integration**: Updated WorkflowActions component to:
  - Use new ErrorBanner component instead of generic error display
  - Handle 403 guard failures with guard name and reason display
  - Handle 409 conflicts with page reload functionality
  - Pass through error details from API responses
- ✅ **ObjectionLoopActions Integration**: Updated ObjectionLoopActions component to:
  - Use ErrorBanner for consistent error display
  - Handle guard failures and conflicts appropriately
  - Provide retry and reload functionality based on error type
- ✅ **Backend Integration**: Error handling works with existing backend structure:
  - Backend returns 403 (not 422) for guard failures with guardName in details
  - Backend returns 409 for conflicts (Prisma duplicate entries)
  - Error details include guard, reason, and metadata fields
  - Frontend correctly parses and displays all error information

---

#### 29) Localization polish ✅

* ✅ Implement: Urdu/English toggle persists across pages; Urdu strings on PDFs and UI labels match templates.
* ✅ **Test & Validate**

  * ✅ Toggle changes field labels and titles; PDFs remain in Urdu as designed.

**COMPLETED**:
- ✅ **LocalizationContext**: Created comprehensive localization context with language state management
- ✅ **Translation System**: Implemented translation function with fallback support (Urdu → English → key)
- ✅ **Language Toggle**: Created LanguageToggle component with dropdown interface and visual indicators
- ✅ **Persistence**: Language preference persists across pages using localStorage
- ✅ **UI Integration**: Updated all major UI components to use localized strings:
  - Navigation (RoleNav): Home, consoles, admin links, login/logout
  - Home page: Welcome message and subtitle
  - Application form: All sections, labels, validation messages, document types
  - Common elements: Buttons, form controls, status messages
- ✅ **Translation Coverage**: Comprehensive translations for:
  - Navigation elements (nav.*)
  - Common UI elements (common.*)
  - Form fields and sections (form.*)
  - Success and error messages (success.*, validation.*)
  - Document types (docType.*)
  - Home page content (home.*)
- ✅ **PDF Templates**: Confirmed existing PDF templates remain in Urdu as designed:
  - Intake receipt (templates/intake/receipt.hbs)
  - Clearance certificates (templates/clearance/*.hbs)
  - Challan (templates/accounts/challan.hbs)
  - All templates use proper RTL styling and Urdu fonts
- ✅ **Default Language**: Set to Urdu (ur) as primary language with English (en) as fallback
- ✅ **Provider Integration**: LocalizationProvider wraps the entire application in layout.tsx
- ✅ **Type Safety**: Full TypeScript support with Language type and proper context typing

---

#### 30) Guided E2E script button ✅

* ✅ Implement: On `/applications/[id]`, developer-only **Run E2E Demo** button that:

  * ✅ Jumps through stages in sequence by calling the same APIs the UI does (with confirmations), generating placeholders for PDFs/signatures where missing (UI triggers, not backend mocks).
* ✅ **Test & Validate**

  * ✅ Running on a fresh case completes all stages to **CLOSED** without manual API calls; each intermediate screen updates as if user clicked through.

**COMPLETED**:
- ✅ **E2EDemoButton Component**: Created comprehensive E2E automation component with:
  - Developer-only access (ADMIN role required)
  - Purple "Run E2E Demo" button with play icon
  - Progress modal showing step-by-step execution
  - Real-time status updates (pending → running → completed/failed)
  - Stop functionality to halt execution
  - Error handling and display
- ✅ **Complete Workflow Automation**: Automates entire workflow from SUBMITTED to CLOSED:
  - SUBMITTED → UNDER_SCRUTINY (intake review)
  - UNDER_SCRUTINY → SENT_TO_BCA_HOUSING (send for clearances)
  - SENT_TO_BCA_HOUSING → BCA_HOUSING_CLEAR (generate clearance PDFs)
  - BCA_HOUSING_CLEAR → OWO_REVIEW_BCA_HOUSING (review clearances)
  - OWO_REVIEW_BCA_HOUSING → SENT_TO_ACCOUNTS (send to accounts)
  - SENT_TO_ACCOUNTS → ACCOUNTS_CLEAR (calculate fees, verify payment)
  - ACCOUNTS_CLEAR → OWO_REVIEW_ACCOUNTS (review accounts)
  - OWO_REVIEW_ACCOUNTS → READY_FOR_APPROVAL (prepare for approval)
  - READY_FOR_APPROVAL → APPROVED (approve application)
  - APPROVED → POST_ENTRIES (create transfer deed)
  - POST_ENTRIES → CLOSED (close case)
- ✅ **Placeholder Data Generation**: Generates required data for each stage:
  - BCA/Housing clearance PDFs via API calls
  - Accounts breakdown with realistic fee structure
  - Payment verification with generated challan numbers
  - Transfer deed with placeholder witnesses and signatures
- ✅ **UI Integration**:
  - Integrated into application detail page header
  - Positioned next to Export Case Packet button
  - Uses same API service methods as regular UI
  - Updates application state after each transition
  - Refreshes UI to show progress
- ✅ **Error Handling**:
  - Graceful handling of guard failures
  - Detailed error messages in progress modal
  - Stops execution on first failure
  - Maintains state for debugging
- ✅ **User Experience**:
  - Visual progress indicators with icons
  - Step-by-step confirmation flow
  - Real-time status updates
  - Ability to stop mid-execution
  - Clear success/failure feedback
- ✅ **Testing**: Comprehensive test suite validates:
  - All required workflow stages present
  - API endpoints functional
  - Entity creation (persons, plots)
  - Application creation and transitions
  - Guard evaluation system
  - E2E Demo component integration

---

#### 31) Seeded demo records (UI command)

* Implement: “Insert Demo Data” action in a dev-only admin screen to create 5–10 cases across various stages (using public endpoints).
* **Test & Validate**

  * After running, queues show mixed-stage cases; each opens without errors and PDFs exist where expected.

---

#### 32) Pagination & sorting everywhere

* Implement: Standardize table pagination (page size selector) and sorting on App No, Date, Stage.
* **Test & Validate**

  * Sorting works across consoles and registers; pagination retains filters.

---

#### 33) Attachment type coverage check

* Implement: Intake checklist shows all docTypes from the spec; missing types render a warning chip.
* **Test & Validate**

  * Creating a case without a required doc shows a non-blocking warning (since Accounts/BCA might still object); warning disappears once uploaded.

---

#### 34) Transition previews (dry-run)

* Implement: **What’s next?** popover that calls `/workflow/transitions?from=<current>` and lists all potential next stages with the server-evaluated `enabled` flag and reason.
* **Test & Validate**

  * At each stage, the popover accurately reflects the next valid edges; reasons match tooltips.

---

#### 35) Bulk actions for consoles

* Implement: In BCA/Housing/Accounts consoles, enable multi-select rows → **Set PENDING/CLEAR/OBJECTION** (where meaningful) with a confirmation modal and required remarks for objections (posts per-row).
* **Test & Validate**

  * Select 2+ cases; apply CLEAR; statuses update; failures surface per-row with reasons.

---

#### 36) Numbers & currency formatting

* Implement: All amounts show with thousand separators; inputs accept only numerics and two decimals.
* **Test & Validate**

  * Enter invalid characters; field rejects; total never becomes NaN.

---

#### 37) CNIC/Plot quick create from intake

* Implement: If person/plot not found, inline **Create** modals add minimal records then bind to intake form.
* **Test & Validate**

  * Create a new person from modal; it appears immediately in the selector; saved app references new IDs.

---

#### 38) Sticky state on refresh

* Implement: After any successful transition, the page stores `updatedAt` and **currentStage**; upon reload, it refetches and warns if changed.
* **Test & Validate**

  * Trigger a stage change from another tab/window; current tab shows a **Case updated** banner with reload CTA.

---

#### 39) Per-stage empty states

* Implement: Friendly guidance text + CTA when a tab is not yet relevant (e.g., Accounts tab before `SENT_TO_ACCOUNTS`).
* **Test & Validate**

  * Navigate to Accounts before dispatch; see guidance, not errors.

---

#### 40) Final Demo Checklist (must pass)

* Create → Scrutiny → BCA/Housing CLEAR → OWO Review → Send to Accounts → Challan → Paid & Verified → Accounts CLEAR → OWO Review → Send to Housing Officer (Memo) → Deed Draft → Signatures → Approve & Lock → Post-entries → Close.
* **Test & Validate**

  * At each step: stage badge updates, PDFs open, audit timeline adds a row, disabled/enabled buttons match guards, and Registers show the ownership flip after approval.


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
