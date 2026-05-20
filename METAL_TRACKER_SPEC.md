# Metal Casting Tracker — Programmer Specification
**Client:** BIG Jewelry, New York  
**Document Date:** 2026-04-29  
**Version:** 1.0

---

## 1. System Overview

BIG Jewelry ships gold and silver castings (produced in the USA from waxes sent by Indian factories) back to those factories for stone-setting and polishing. Because the castings originate in the USA and do not change form in India, the metal component is exempt from US import tariffs when returned as finished goods.

This system tracks:
- Every casting shipment sent from NY to India (by factory, metal type, and purity)
- Every finished goods return shipment received in NY from India
- The live metal balance (in grams) held at each factory, by purity
- Open purchase orders imported from the ERP
- Full audit trail of all transactions

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Database | MySQL |
| Backend | Developer's choice (PHP/Laravel or Node.js recommended) |
| Frontend | Web-based, responsive (desktop-primary) |
| Authentication | Session-based or JWT |
| Email | SMTP (configurable in admin settings) |
| File Export | PDF and Excel (XLSX) |
| FTP Integration | Scheduled pull from ERP FTP server |

---

## 3. User Roles & Permissions

### Role Definitions

| Role | Code | Description |
|---|---|---|
| Admin | ADMIN | Full access. Multiple users may have this role. |
| Office | OFFICE | NY office staff — create shipments, receive invoices, view all data |
| Viewer | VIEWER | Read-only access to all data. No create, edit, or delete. |
| Factory | FACTORY | Restricted to their own factory's data. Linked to a single Factory Code. |

### Permission Matrix

| Action | ADMIN | OFFICE | VIEWER | FACTORY |
|---|---|---|---|---|
| Create casting shipment (NY→India) | Yes | Yes | No | No |
| Edit casting shipment (Draft only) | Yes | Yes | No | No |
| Approve / Reject casting shipment | Yes | No | No | Yes (own factory) |
| Enter tracking number | Yes | Yes | No | No |
| Create factory invoice (India→NY) | Yes | Yes | No | Yes (own factory) |
| Accept / receive factory invoice | Yes | Yes | No | No |
| View all shipments & invoices | Yes | Yes | Yes | Own factory only |
| View metal balances | Yes | Yes | Yes | Own factory only |
| Manual balance adjustment | Yes | No | No | No |
| Manage users | Yes | No | No | No |
| Manage factories | Yes | No | No | No |
| Configure FTP / system settings | Yes | No | No | No |
| View audit log | Yes | No | No | No |
| View / export reports | Yes | Yes | Yes | Own factory only |
| Import Open POs (FTP trigger) | Yes | Yes | No | No |

---

## 4. Document Numbering

### Casting Shipment Numbers (NY → India)
- **Format:** `NY-YYMMDD-######`
- `YYMMDD` = creation date (e.g., 260429 for April 29, 2026)
- `######` = globally sequential 6-digit zero-padded counter (never resets, increments across all dates)
- **Example:** `NY-260429-000001`, `NY-260429-000002`, `NY-260502-000003`
- Generated automatically by the system on shipment creation. User cannot edit it.

### Factory Invoice Numbers (India → NY)
- Invoice # = entered manually exactly as it appears on the factory's paperwork
- System also assigns an internal auto-increment ID for internal reference

---

## 5. Module 1 — Casting Shipments (NY → India)

### 5.1 Purpose
Records every shipment of gold or silver castings sent from New York to an Indian factory.

### 5.2 Business Rules
- Gold and silver must be in **separate shipment documents**. A single shipment is either all gold or all silver — not mixed.
- Each detail line within a gold shipment is for one karat (10KT, 14KT, or 18KT).
- Each detail line within a silver shipment is for 925 silver.
- A shipment may have **multiple detail lines** (e.g., one line for 14KT, another for 18KT in the same gold shipment).
- Metal balance at the factory is **increased** when the factory marks the shipment as Received.

### 5.3 Status Workflow

```
DRAFT → APPROVED (by Factory) → SHIPPED (by Office, after entering tracking #) → RECEIVED (by Factory)
         ↓
       REJECTED (by Factory, with notes) → back to DRAFT for Office to correct and resubmit
```

| Status | Set By | Trigger |
|---|---|---|
| DRAFT | System | Shipment is created |
| APPROVED | Factory user | Factory approves in the portal |
| REJECTED | Factory user | Factory rejects; enters notes |
| SHIPPED | System | Office saves a tracking number to an APPROVED shipment |
| RECEIVED | Factory user | Factory confirms physical receipt in the portal |

### 5.4 Data Model — Header

| Field | Type | Notes |
|---|---|---|
| Shipment Number | VARCHAR(20) | Auto-generated, format NY-YYMMDD-###### |
| Factory | FK → factories | Required |
| Metal Type | ENUM('GOLD','SILVER') | Required; controls valid purities on lines |
| Shipment Date | DATE | Auto-set to creation date; read-only |
| Dollar Value | DECIMAL(10,2) | Total declared USD value of the shipment |
| Status | ENUM | DRAFT / APPROVED / REJECTED / SHIPPED / RECEIVED |
| Carrier | VARCHAR(50) | Default: FedEx |
| Tracking Number | VARCHAR(100) | Entered by Office after factory approval |
| Rejection Notes | TEXT | Entered by factory if rejected |
| Approved By | FK → users | Factory user who approved |
| Approved At | DATETIME | |
| Shipped At | DATETIME | Timestamp when tracking # saved |
| Received At | DATETIME | Timestamp when factory marks received |
| Created By | FK → users | |
| Created At | DATETIME | |
| Updated At | DATETIME | |

### 5.5 Data Model — Detail Lines

| Field | Type | Notes |
|---|---|---|
| Line ID | INT PK | Auto-increment |
| Shipment ID | FK → casting_shipments | |
| Metal Purity | ENUM('10KT','14KT','18KT','925') | Must match parent Metal Type |
| Pieces | INT | Number of casting pieces |
| Net Weight (g) | DECIMAL(10,3) | Grams |
| Dollar Value | DECIMAL(10,2) | Line-level declared value |

### 5.6 UI — Casting Shipments List Screen

**Location in navigation:** Shipments → Castings to India

**Filters (top of page):**
- Factory (dropdown)
- Metal Type (All / Gold / Silver)
- Status (All / Draft / Approved / Rejected / Shipped / Received)
- Date Range (From / To)
- Shipment Number (free text)

**Table columns:**
| Shipment # | Factory | Date | Metal Type | Status | Total Pieces | Total Grams | Total Value (USD) | Tracking | Actions |

- Shipment # links to detail view
- Tracking number renders as a **clickable hyperlink** to `https://www.fedex.com/apps/fedextrack/?tracknumbers={tracking_number}` (or carrier URL from factory profile for other carriers)
- Status shown as a colored badge (Draft=grey, Approved=blue, Rejected=red, Shipped=orange, Received=green)
- Actions column: View | Edit (Draft only) | Delete (Draft only, Admin only)

**Buttons:**
- "New Gold Shipment" (orange)
- "New Silver Shipment" (grey/silver)
- "Export" → Excel or PDF

### 5.7 UI — Create / Edit Casting Shipment

**Header section:**
- Shipment # (read-only, auto-generated)
- Factory (dropdown — required)
- Shipment Date (read-only, auto)
- Metal Type (read-only — set at creation, cannot change)
- Carrier (text, default "FedEx")
- Dollar Value (currency input — total; auto-sums from lines, but allow manual override)
- Status (read-only badge)

**Detail Lines section (repeating rows, add/remove):**
- Metal Purity (dropdown filtered by Metal Type)
- Pieces (integer)
- Net Weight (decimal, grams)
- Dollar Value (decimal, USD)
- Delete row button

**Totals row (auto-calculated):**
- Total Pieces | Total Net Weight | Total Dollar Value

**Action buttons:**
- Save as Draft
- Submit (sends to factory for approval — status stays DRAFT but factory is notified by email)
- Cancel

### 5.8 UI — Casting Shipment Detail View (Read-only)

Shows all header and line data. Additional section at bottom:

**Status History panel** — shows each status change with timestamp and user name.

**Actions available by role and status:**

| Role | Status | Available Actions |
|---|---|---|
| OFFICE / ADMIN | DRAFT | Edit, Delete, Submit for Approval |
| FACTORY | DRAFT | Approve (with confirmation), Reject (requires notes) |
| OFFICE / ADMIN | APPROVED | Enter Tracking Number (saves → status becomes SHIPPED) |
| FACTORY | SHIPPED | Mark as Received |
| FACTORY | REJECTED | View notes only |
| OFFICE / ADMIN | REJECTED | Edit and Resubmit |

**Tracking Number Entry:**
- When status is APPROVED, a prominent input appears: "Enter Tracking Number"
- Saving the tracking number triggers status → SHIPPED and timestamps the event

---

## 6. Module 2 — Factory Invoices (India → NY)

### 6.1 Purpose
Records finished goods returned from Indian factories to New York. When NY marks an invoice as Accepted, the factory's metal balance is reduced by the received net weight per purity.

### 6.2 Business Rules
- Invoice header info is entered manually by NY office (or factory) based on paperwork received.
- Metal balance is deducted **only when NY marks the invoice as ACCEPTED** (not when factory ships).
- An invoice may have multiple detail lines (multiple purities on one invoice).
- The dollar value on each invoice is the factory's invoice value in USD.

### 6.3 Status Workflow

```
PENDING → ACCEPTED (by Office/Admin when goods physically received in NY)
```

| Status | Set By | Trigger |
|---|---|---|
| PENDING | System | Invoice record is created |
| ACCEPTED | Office / Admin | NY receives goods; enters receipt detail and accepts |

### 6.4 Data Model — Header

| Field | Type | Notes |
|---|---|---|
| Internal ID | INT PK | Auto-increment |
| Factory | FK → factories | Required |
| Invoice Date | DATE | From factory paperwork |
| Invoice Number | VARCHAR(100) | Manual, from factory paperwork |
| Carrier | VARCHAR(100) | Pulled from factory profile as default; editable |
| Tracking Number | VARCHAR(100) | From factory paperwork |
| Total Dollar Value | DECIMAL(10,2) | USD value on factory invoice |
| Status | ENUM('PENDING','ACCEPTED') | |
| Received Date | DATE | Date NY physically received the goods |
| Received By | FK → users | |
| Created By | FK → users | |
| Created At | DATETIME | |
| Updated At | DATETIME | |

### 6.5 Data Model — Detail Lines (entered when Accepted)

| Field | Type | Notes |
|---|---|---|
| Line ID | INT PK | |
| Invoice ID | FK → factory_invoices | |
| Metal Purity | ENUM('10KT','14KT','18KT','925') | |
| Pieces | INT | |
| Net Weight Received (g) | DECIMAL(10,3) | This drives the balance deduction |
| Dollar Value | DECIMAL(10,2) | Line-level USD value |

### 6.6 UI — Factory Invoices List Screen

**Location:** Shipments → Invoices from India

**Filters:**
- Factory (dropdown)
- Status (All / Pending / Accepted)
- Date Range (Invoice Date From / To)
- Invoice # (free text)

**Table columns:**
| Internal ID | Factory | Invoice Date | Invoice # | Carrier | Tracking | Total Grams | Total Value (USD) | Status | Actions |

- Tracking number as clickable hyperlink (carrier URL from factory profile)
- Status as colored badge (Pending=yellow, Accepted=green)

**Buttons:**
- "New Invoice" 
- "Export" → Excel or PDF

### 6.7 UI — Create / Edit Factory Invoice

**Header section:**
- Factory (dropdown — required)
- Invoice Date (date picker)
- Invoice Number (text — manual entry)
- Carrier (text, default from factory profile)
- Tracking Number (text)
- Total Dollar Value (currency)
- Status (read-only badge)

**Receipt Detail Lines** (visible and editable only when Accepting):
- Metal Purity (dropdown: 10KT / 14KT / 18KT / 925)
- Pieces
- Net Weight Received (g)
- Dollar Value
- Add / Remove row

**Action buttons:**
- Save (status stays PENDING)
- Accept Shipment (only Office/Admin) — opens a confirmation dialog:
  > "Accepting this invoice will deduct [X]g of [purity] from [Factory]'s balance. Confirm?"
  - On confirm: saves receipt lines, updates metal balances, sets status = ACCEPTED, records received date and user

---

## 7. Module 3 — Metal Balances

### 7.1 Purpose
Shows the current net weight of castings at each factory, broken down by metal purity. Serves as the source of truth for how much US-origin metal is being held offshore.

### 7.2 Balance Logic

| Event | Effect on Balance |
|---|---|
| Casting shipment marked RECEIVED by factory | **Add** net weight per purity line |
| Factory invoice marked ACCEPTED by NY | **Deduct** net weight per purity line |
| Admin manual adjustment | **Add or subtract** with mandatory reason note |
| Opening balance entry (Admin) | Set initial value for each factory/purity |

### 7.3 Data Model — Balances Table

One row per factory per metal purity:

| Field | Type | Notes |
|---|---|---|
| balance_id | INT PK | |
| factory_id | FK → factories | |
| metal_purity | ENUM('10KT','14KT','18KT','925') | |
| balance_grams | DECIMAL(10,3) | Current net grams at factory |
| last_updated_at | DATETIME | |

### 7.4 Data Model — Balance Adjustments (admin)

| Field | Type | Notes |
|---|---|---|
| adjustment_id | INT PK | |
| factory_id | FK → factories | |
| metal_purity | ENUM | |
| adjustment_grams | DECIMAL(10,3) | Positive = add, Negative = deduct |
| reason | TEXT | Required |
| adjusted_by | FK → users | |
| adjusted_at | DATETIME | |

### 7.5 UI — Metal Balances Screen

**Location:** Balances → Metal Balances

**Display:** Card or table per factory, showing:

| Factory | 10KT (g) | 14KT (g) | 18KT (g) | 925 Silver (g) | Last Updated |

- Color coding: Green if balance > 0, Yellow if balance is within 10% of zero, Red if balance is zero or negative (indicates data issue)

**Admin controls:**
- "Set Opening Balance" button (per factory/purity) — available until first transaction is posted; thereafter replaced by manual adjustment
- "Manual Adjustment" button (Admin only) — opens modal:
  - Factory, Metal Purity, Adjustment Amount (±), Reason (required text field)
  - Saves and logs to audit trail

**Adjustment History (per factory):**
- Expandable section showing all manual adjustments with date, amount, reason, admin user

---

## 8. Module 4 — Open POs Dashboard

### 8.1 Purpose
Displays open purchase orders from the ERP system. Data is imported automatically via FTP from a JSON file. This section is **read-only** for all users (no editing in this system).

### 8.2 Data Source
- JSON file delivered to a configured FTP path by the ERP system
- System polls FTP automatically on a configurable schedule (e.g., every 15 minutes, or hourly)
- Admin can also trigger a manual import from the Admin Panel
- On import: existing open PO records are replaced/upserted based on PO number
- Image filenames in the JSON resolve to: `https://03ee8bc.netsolhost.com/posystem/files/images/{image_filename}`

### 8.3 JSON File Structure (expected format from ERP)

```json
[
  {
    "po_number": "PO-2026-0123",
    "vendor": "Factory Name",
    "po_date": "2026-03-15",
    "item": "RING-14K-SOLITAIRE",
    "kt": "14KT",
    "unit_fgr": 5.2,
    "qty_ordered": 100,
    "qty_received": 40,
    "image": "ring_14k_sol.jpg"
  }
]
```

`qty_open` and `total_open_fgr` are **calculated by the system**:
- `qty_open = qty_ordered - qty_received`
- `total_open_fgr = qty_open × unit_fgr`

### 8.4 Data Model — Open POs Table

| Field | Type | Notes |
|---|---|---|
| po_id | INT PK | |
| po_number | VARCHAR(50) | Unique key for upsert |
| vendor | VARCHAR(100) | |
| po_date | DATE | |
| item | VARCHAR(100) | |
| kt | VARCHAR(10) | e.g., 10KT, 14KT, 18KT, 925, etc. |
| unit_fgr | DECIMAL(10,3) | Unit finished goods returned (grams) |
| qty_ordered | INT | |
| qty_received | INT | |
| qty_open | INT | Calculated on import |
| total_open_fgr | DECIMAL(10,3) | Calculated on import |
| image_filename | VARCHAR(255) | |
| last_imported_at | DATETIME | |
| is_active | TINYINT(1) | 1=active, 0=removed from last import |

### 8.5 UI — Open POs Screen

**Location:** Dashboard → Open POs

**Filters (top):**
- Vendor (dropdown — populated from data)
- Item (dropdown — populated from data)
- KT (dropdown: 10KT / 14KT / 18KT / 925 / All)
- Free text search (searches PO#, vendor, item simultaneously)

**Table columns:**
| PO # | Vendor | PO Date | Item | KT | Unit FGR | Qty Ord. | Qty Rcvd. | Qty Open | Total Open FGR | Image |

- Image column: thumbnail (click to enlarge in modal)
- Sortable columns: PO Date, Vendor, KT, Qty Open, Total Open FGR

**Footer row:** Totals for Qty Ord., Qty Rcvd., Qty Open, Total Open FGR

**Buttons:**
- "Export" → Excel or PDF
- "Refresh from FTP" (Admin / Office only) — manual import trigger with status feedback

**Last Imported timestamp** shown at top right.

---

## 9. Module 5 — Admin Panel

**Location:** Admin (visible only to ADMIN role)

### 9.1 User Management

**Screen: Users List**
- Table: Name | Email | Role | Factory (if Factory role) | Status (Active/Inactive) | Last Login | Actions
- Actions: Edit | Deactivate | Reset Password

**Screen: Create / Edit User**
- First Name, Last Name
- Email (login username)
- Password (set on create; reset sends email link)
- Role (dropdown: Admin / Office / Viewer / Factory)
- Factory (dropdown — only visible when Role = Factory; links the user to a single factory)
- Is Active (toggle)

**Business Rule:** A Factory role user must be linked to exactly one factory. They can only see data for that factory.

### 9.2 Factory Management

**Screen: Factories List**
- Table: Factory Code | Factory Name | Country | Contact Name | Contact Email | Default Carrier | Active | Actions
- Actions: Edit | Deactivate

**Screen: Create / Edit Factory**
- Factory Code (unique short code, e.g., "IND-FAC-01") — used in reporting and balances
- Factory Name
- Country (default: India)
- Contact Name
- Contact Email (used for notification emails sent to factory)
- Default Return Carrier (text — used on factory invoices, e.g., "DHL", "FedEx", "BlueDart")
- Address (multi-line text)
- Is Active (toggle)
- Opening Balance section: Set initial grams per purity (10KT / 14KT / 18KT / 925)

### 9.3 System Settings

- SMTP Configuration (host, port, username, password, from address)
- FTP Configuration (host, port, path to JSON file, username, password, poll interval in minutes)
- FTP Last Sync Status (last success/failure timestamp and message)
- Manual FTP Sync button

### 9.4 Audit Log Viewer

**Filters:**
- User (dropdown)
- Action Type (dropdown: All, Status Change, Shipment Created, Invoice Created/Accepted, Balance Adjusted, User Created/Edited, Login, Import)
- Entity Type (Casting Shipment / Factory Invoice / User / Factory / Balance)
- Date Range

**Table:** Timestamp | User | Action | Entity Type | Entity ID / Reference | Details (old → new value)

- Paginated, 50 rows per page
- Export to Excel

---

## 10. Module 6 — Dashboard / Home

**Location:** Home (default landing page after login)

### Summary Cards (top row)
- Total Open Casting Shipments (by status: Draft, Approved, Shipped)
- Total Pending Factory Invoices awaiting acceptance
- Number of factories with metal balances
- Last FTP import timestamp

### Metal Balance Summary Table
Quick view: Factory | 10KT (g) | 14KT (g) | 18KT (g) | Silver 925 (g) — with links to full balance screen

### Recent Activity Feed
Last 10 status changes across both shipment types, with timestamp and user.

### Quick Links
- New Gold Shipment
- New Silver Shipment  
- Open POs

---

## 11. Module 7 — Email Notifications

All emails use configurable SMTP. All emails are also logged in an `email_log` table (recipient, subject, body, timestamp, related entity).

| Trigger | Recipients | Subject | Body includes |
|---|---|---|---|
| NY creates/submits a casting shipment | Factory contact email | "New Casting Shipment Awaiting Approval — [Shipment #]" | Shipment #, factory, metal type, total grams, link to portal |
| Factory approves a casting shipment | NY office email list | "Casting Shipment [Shipment #] Approved by [Factory]" | Shipment #, approval timestamp, link to portal |
| Factory rejects a casting shipment | NY office email list | "Casting Shipment [Shipment #] Rejected — Action Required" | Shipment #, factory notes, link to portal |
| Factory marks shipment Received | NY office email list | "Casting Shipment [Shipment #] Received at [Factory]" | Shipment #, received date, updated balances |
| NY accepts a factory invoice | Factory contact email | "Invoice [Invoice #] Accepted by NY Office" | Invoice #, accepted date, grams received per purity |

**NY office email list** = all active users with role ADMIN or OFFICE. Configurable in System Settings as a comma-separated override list.

---

## 12. Module 8 — Reports & Exports

All reports support: **Preview in browser** | **Export to Excel (.xlsx)** | **Export to PDF**

### 12.1 Casting Shipments Report
- Filters: Factory, Date Range, Status, Metal Type
- Columns: Shipment #, Factory, Date, Metal Type, Purity, Pieces, Net Grams, Dollar Value, Status, Tracking #

### 12.2 Factory Invoices Report
- Filters: Factory, Date Range, Status
- Columns: Invoice #, Factory, Invoice Date, Purity, Pieces, Net Grams Received, Dollar Value, Status, Received Date

### 12.3 Metal Balance Statement (per factory)
- Filter: Factory, As-of Date
- Shows: Opening balance, all additions (casting shipments received), all deductions (invoices accepted), all manual adjustments, closing balance — per purity

### 12.4 Factory Activity Summary
- Filters: Factory, Date Range
- Shipments in, shipments out, net balance movement per purity

### 12.5 Open POs Report
- Same as the dashboard Open POs screen but exportable
- Filters: Vendor, Item, KT, Free text

### 12.6 Audit Log Export
- Same as admin audit log viewer but exportable to Excel

---

## 13. Database Schema (MySQL)

### 13.1 Table: `factories`

```sql
CREATE TABLE factories (
  factory_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_code    VARCHAR(20) NOT NULL UNIQUE,
  factory_name    VARCHAR(100) NOT NULL,
  country         VARCHAR(50) NOT NULL DEFAULT 'India',
  contact_name    VARCHAR(100),
  contact_email   VARCHAR(150),
  default_carrier VARCHAR(100) DEFAULT 'FedEx',
  address         TEXT,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
);
```

### 13.2 Table: `users`

```sql
CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','OFFICE','VIEWER','FACTORY') NOT NULL,
  factory_id    INT UNSIGNED NULL,         -- only for FACTORY role
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  INDEX idx_role (role),
  INDEX idx_active (is_active),
  INDEX idx_factory (factory_id)
);
```

### 13.3 Table: `casting_shipments`

```sql
CREATE TABLE casting_shipments (
  shipment_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shipment_number VARCHAR(20) NOT NULL UNIQUE,   -- NY-YYMMDD-######
  factory_id      INT UNSIGNED NOT NULL,
  metal_type      ENUM('GOLD','SILVER') NOT NULL,
  shipment_date   DATE NOT NULL,
  dollar_value    DECIMAL(10,2) DEFAULT 0.00,
  carrier         VARCHAR(100) DEFAULT 'FedEx',
  tracking_number VARCHAR(100),
  status          ENUM('DRAFT','APPROVED','REJECTED','SHIPPED','RECEIVED') NOT NULL DEFAULT 'DRAFT',
  rejection_notes TEXT,
  approved_by     INT UNSIGNED,
  approved_at     DATETIME,
  shipped_at      DATETIME,
  received_at     DATETIME,
  created_by      INT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_factory (factory_id),
  INDEX idx_status (status),
  INDEX idx_date (shipment_date),
  INDEX idx_metal (metal_type)
);
```

### 13.4 Table: `casting_shipment_lines`

```sql
CREATE TABLE casting_shipment_lines (
  line_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shipment_id    INT UNSIGNED NOT NULL,
  metal_purity   ENUM('10KT','14KT','18KT','925') NOT NULL,
  pieces         INT UNSIGNED NOT NULL DEFAULT 0,
  net_weight_g   DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  dollar_value   DECIMAL(10,2) DEFAULT 0.00,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES casting_shipments(shipment_id) ON DELETE CASCADE,
  INDEX idx_shipment (shipment_id),
  INDEX idx_purity (metal_purity)
);
```

### 13.5 Table: `factory_invoices`

```sql
CREATE TABLE factory_invoices (
  invoice_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id     INT UNSIGNED NOT NULL,
  invoice_date   DATE NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  carrier        VARCHAR(100),
  tracking_number VARCHAR(100),
  dollar_value   DECIMAL(10,2) DEFAULT 0.00,
  status         ENUM('PENDING','ACCEPTED') NOT NULL DEFAULT 'PENDING',
  received_date  DATE,
  received_by    INT UNSIGNED,
  created_by     INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  FOREIGN KEY (received_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_factory (factory_id),
  INDEX idx_status (status),
  INDEX idx_invoice_date (invoice_date),
  UNIQUE INDEX idx_factory_invoice (factory_id, invoice_number)
);
```

### 13.6 Table: `factory_invoice_lines`

```sql
CREATE TABLE factory_invoice_lines (
  line_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id    INT UNSIGNED NOT NULL,
  metal_purity  ENUM('10KT','14KT','18KT','925') NOT NULL,
  pieces        INT UNSIGNED DEFAULT 0,
  net_weight_g  DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  dollar_value  DECIMAL(10,2) DEFAULT 0.00,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES factory_invoices(invoice_id) ON DELETE CASCADE,
  INDEX idx_invoice (invoice_id),
  INDEX idx_purity (metal_purity)
);
```

### 13.7 Table: `metal_balances`

```sql
CREATE TABLE metal_balances (
  balance_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id      INT UNSIGNED NOT NULL,
  metal_purity    ENUM('10KT','14KT','18KT','925') NOT NULL,
  balance_grams   DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  UNIQUE INDEX idx_factory_purity (factory_id, metal_purity)
);
```

### 13.8 Table: `balance_transactions`

Every change to `metal_balances` is recorded here for full history and the balance statement report.

```sql
CREATE TABLE balance_transactions (
  txn_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id      INT UNSIGNED NOT NULL,
  metal_purity    ENUM('10KT','14KT','18KT','925') NOT NULL,
  txn_type        ENUM('CASTING_IN','INVOICE_OUT','MANUAL_ADJUSTMENT','OPENING_BALANCE') NOT NULL,
  grams_change    DECIMAL(10,3) NOT NULL,   -- positive = in, negative = out
  balance_after   DECIMAL(10,3) NOT NULL,
  reference_id    INT UNSIGNED,             -- shipment_id or invoice_id or adjustment_id
  reference_type  VARCHAR(30),              -- 'casting_shipment' / 'factory_invoice' / 'adjustment'
  notes           TEXT,
  performed_by    INT UNSIGNED NOT NULL,
  performed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  FOREIGN KEY (performed_by) REFERENCES users(user_id),
  INDEX idx_factory_purity (factory_id, metal_purity),
  INDEX idx_type (txn_type),
  INDEX idx_date (performed_at)
);
```

### 13.9 Table: `balance_adjustments`

```sql
CREATE TABLE balance_adjustments (
  adjustment_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id      INT UNSIGNED NOT NULL,
  metal_purity    ENUM('10KT','14KT','18KT','925') NOT NULL,
  adjustment_grams DECIMAL(10,3) NOT NULL,
  reason          TEXT NOT NULL,
  adjusted_by     INT UNSIGNED NOT NULL,
  adjusted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  FOREIGN KEY (adjusted_by) REFERENCES users(user_id),
  INDEX idx_factory (factory_id)
);
```

### 13.10 Table: `open_pos`

```sql
CREATE TABLE open_pos (
  po_id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_number        VARCHAR(50) NOT NULL UNIQUE,
  vendor           VARCHAR(100),
  po_date          DATE,
  item             VARCHAR(100),
  kt               VARCHAR(10),
  unit_fgr         DECIMAL(10,3) DEFAULT 0.000,
  qty_ordered      INT DEFAULT 0,
  qty_received     INT DEFAULT 0,
  qty_open         INT GENERATED ALWAYS AS (qty_ordered - qty_received) STORED,
  total_open_fgr   DECIMAL(10,3) GENERATED ALWAYS AS ((qty_ordered - qty_received) * unit_fgr) STORED,
  image_filename   VARCHAR(255),
  is_active        TINYINT(1) DEFAULT 1,
  last_imported_at DATETIME,
  INDEX idx_vendor (vendor),
  INDEX idx_kt (kt),
  INDEX idx_active (is_active)
);
```

### 13.11 Table: `ftp_import_log`

```sql
CREATE TABLE ftp_import_log (
  import_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  imported_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  triggered_by     INT UNSIGNED,            -- NULL if auto/scheduled
  records_upserted INT DEFAULT 0,
  records_deactivated INT DEFAULT 0,
  status           ENUM('SUCCESS','FAILURE') NOT NULL,
  error_message    TEXT,
  FOREIGN KEY (triggered_by) REFERENCES users(user_id)
);
```

### 13.12 Table: `audit_log`

```sql
CREATE TABLE audit_log (
  log_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED,
  action_type  VARCHAR(50) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    INT UNSIGNED,
  old_value    JSON,
  new_value    JSON,
  notes        TEXT,
  ip_address   VARCHAR(45),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_user (user_id),
  INDEX idx_action (action_type),
  INDEX idx_date (created_at)
);
```

### 13.13 Table: `email_log`

```sql
CREATE TABLE email_log (
  email_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient     VARCHAR(150) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  body          TEXT,
  sent_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('SENT','FAILED') NOT NULL,
  error_message TEXT,
  entity_type   VARCHAR(50),
  entity_id     INT UNSIGNED,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_date (sent_at)
);
```

### 13.14 Table: `system_settings`

```sql
CREATE TABLE system_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_by    INT UNSIGNED,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Seed with keys: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `smtp_from`,
`ftp_host`, `ftp_port`, `ftp_user`, `ftp_password`, `ftp_path`, `ftp_poll_minutes`,
`ny_notification_emails` (comma-separated override list).

---

## 14. Shipment Number Generation Logic

The sequential counter must be atomic to avoid duplicates under concurrent users.

**Recommended approach:** Maintain a dedicated `shipment_counter` table with a single row. Use a `SELECT ... FOR UPDATE` / `UPDATE` transaction to increment and retrieve the next value before generating the shipment number.

```sql
CREATE TABLE shipment_counter (
  id           INT PRIMARY KEY DEFAULT 1,
  next_value   INT UNSIGNED NOT NULL DEFAULT 1
);
INSERT INTO shipment_counter VALUES (1, 1);
```

**On create:**
1. Begin transaction
2. `SELECT next_value FROM shipment_counter WHERE id=1 FOR UPDATE`
3. Format: `NY-` + `YYMMDD` (today) + `-` + zero-pad `next_value` to 6 digits
4. `UPDATE shipment_counter SET next_value = next_value + 1 WHERE id=1`
5. Commit

---

## 15. Navigation Structure

```
[Dashboard / Home]
[Shipments]
  ├── Castings to India
  └── Invoices from India
[Balances]
  └── Metal Balances
[Open POs]
[Reports]
  ├── Casting Shipments
  ├── Factory Invoices
  ├── Metal Balance Statement
  ├── Factory Activity Summary
  └── Open POs
[Admin]          ← ADMIN role only
  ├── Users
  ├── Factories
  ├── System Settings
  └── Audit Log
[My Account]
  └── Change Password
[Logout]
```

---

## 16. General UI / UX Requirements

- **Responsive:** Desktop-first; must be usable on a tablet.
- **Branding:** BIG Jewelry logo and company colors (client to provide assets).
- **Confirmation dialogs:** Required for all status changes and destructive actions.
- **Inline validation:** All required fields validated before save. Weight/dollar fields must be numeric and non-negative.
- **Pagination:** All list screens paginate at 25 rows per page with option to change to 50 or 100.
- **Loading states:** Spinner on all async operations (save, export, FTP sync).
- **Session timeout:** After 30 minutes of inactivity, redirect to login. Configurable in settings.
- **Print/Export:** Every list screen and report has "Export Excel" and "Export PDF" buttons. Exports include the applied filters in the header of the document.
- **Time zone:** All timestamps displayed in US Eastern Time. Stored in UTC in the database.

---

## 17. Security Requirements

- Passwords stored as bcrypt hashes (minimum cost factor 12).
- All pages require authenticated session. Unauthenticated requests redirect to login.
- Role-based access enforced server-side on every API endpoint — not just in the UI.
- Factory users' API calls validated server-side to ensure `factory_id` in request matches their linked factory. Any mismatch returns HTTP 403.
- CSRF protection on all state-changing forms.
- SQL queries use parameterized statements / prepared statements only — no string concatenation.
- FTP credentials and SMTP credentials encrypted at rest in `system_settings` (AES-256).

---

## 18. Open Items / Decisions for Client

The following items require the client to provide additional information or assets before development begins:

1. **Report format samples** — Client has offered to share preferred layout. Programmer should receive these before building the export templates.
2. **Branding assets** — Logo and color palette for the UI theme.
3. **ERP JSON file structure** — Programmer needs an actual sample JSON export from the ERP to finalize the FTP import parser. The structure defined in Section 8.3 is an assumed format — confirm with ERP vendor.
4. **NY notification email list** — Confirm which specific email addresses (or all OFFICE/ADMIN users) should receive factory notification emails.
5. **FTP access credentials** — Provide FTP server details for testing the ERP import.
6. **Hosting environment** — Client to confirm whether they are providing a server or if the programmer should recommend/provision one.

---

*End of Specification — Version 1.0 — 2026-04-29*
