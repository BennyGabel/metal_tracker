-- Metal Tracker — Initial Schema
-- Run once against an empty MySQL database.
-- Command: mysql -u root -p metal_tracker < migrations/001_initial_schema.sql

SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────
-- factories
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factories (
  factory_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_code    VARCHAR(20)  NOT NULL UNIQUE,
  factory_name    VARCHAR(100) NOT NULL,
  country         VARCHAR(50)  NOT NULL DEFAULT 'India',
  contact_name    VARCHAR(100),
  contact_email   VARCHAR(150),
  default_carrier VARCHAR(100) DEFAULT 'FedEx',
  address         TEXT,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','OFFICE','VIEWER','FACTORY') NOT NULL,
  factory_id    INT UNSIGNED NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  INDEX idx_role (role),
  INDEX idx_active (is_active),
  INDEX idx_factory (factory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- casting_shipments  (NY → India)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casting_shipments (
  shipment_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shipment_number VARCHAR(20)  NOT NULL UNIQUE,
  factory_id      INT UNSIGNED NOT NULL,
  metal_type      ENUM('GOLD','SILVER') NOT NULL,
  shipment_date   DATE         NOT NULL,
  dollar_value    DECIMAL(10,2) DEFAULT 0.00,
  carrier         VARCHAR(100)  DEFAULT 'FedEx',
  tracking_number VARCHAR(100),
  status          ENUM('DRAFT','APPROVED','REJECTED','SHIPPED','RECEIVED') NOT NULL DEFAULT 'DRAFT',
  rejection_notes TEXT,
  approved_by     INT UNSIGNED,
  approved_at     DATETIME,
  shipped_at      DATETIME,
  received_at     DATETIME,
  created_by      INT UNSIGNED NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id)  REFERENCES factories(factory_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by)  REFERENCES users(user_id),
  INDEX idx_factory (factory_id),
  INDEX idx_status (status),
  INDEX idx_date (shipment_date),
  INDEX idx_metal (metal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- casting_shipment_lines
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casting_shipment_lines (
  line_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shipment_id   INT UNSIGNED NOT NULL,
  metal_purity  ENUM('10KT','14KT','18KT','925') NOT NULL,
  pieces        INT UNSIGNED NOT NULL DEFAULT 0,
  net_weight_g  DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  dollar_value  DECIMAL(10,2) DEFAULT 0.00,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES casting_shipments(shipment_id) ON DELETE CASCADE,
  INDEX idx_shipment (shipment_id),
  INDEX idx_purity (metal_purity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- factory_invoices  (India → NY)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_invoices (
  invoice_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id      INT UNSIGNED NOT NULL,
  invoice_date    DATE         NOT NULL,
  invoice_number  VARCHAR(100) NOT NULL,
  carrier         VARCHAR(100),
  tracking_number VARCHAR(100),
  dollar_value    DECIMAL(10,2) DEFAULT 0.00,
  status          ENUM('PENDING','ACCEPTED') NOT NULL DEFAULT 'PENDING',
  received_date   DATE,
  received_by     INT UNSIGNED,
  created_by      INT UNSIGNED NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id)  REFERENCES factories(factory_id),
  FOREIGN KEY (received_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by)  REFERENCES users(user_id),
  INDEX idx_factory (factory_id),
  INDEX idx_status (status),
  INDEX idx_invoice_date (invoice_date),
  UNIQUE INDEX idx_factory_invoice (factory_id, invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- factory_invoice_lines
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_invoice_lines (
  line_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT UNSIGNED NOT NULL,
  metal_purity ENUM('10KT','14KT','18KT','925') NOT NULL,
  pieces       INT UNSIGNED  DEFAULT 0,
  net_weight_g DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  dollar_value DECIMAL(10,2) DEFAULT 0.00,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES factory_invoices(invoice_id) ON DELETE CASCADE,
  INDEX idx_invoice (invoice_id),
  INDEX idx_purity (metal_purity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- metal_balances  (one row per factory/purity)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metal_balances (
  balance_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id      INT UNSIGNED NOT NULL,
  metal_purity    ENUM('10KT','14KT','18KT','925') NOT NULL,
  balance_grams   DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id) REFERENCES factories(factory_id),
  UNIQUE INDEX idx_factory_purity (factory_id, metal_purity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- balance_transactions  (full ledger)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_transactions (
  txn_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id     INT UNSIGNED NOT NULL,
  metal_purity   ENUM('10KT','14KT','18KT','925') NOT NULL,
  txn_type       ENUM('CASTING_IN','INVOICE_OUT','MANUAL_ADJUSTMENT','OPENING_BALANCE') NOT NULL,
  grams_change   DECIMAL(10,3) NOT NULL,
  balance_after  DECIMAL(10,3) NOT NULL,
  reference_id   INT UNSIGNED,
  reference_type VARCHAR(30),
  notes          TEXT,
  performed_by   INT UNSIGNED NOT NULL,
  performed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id)   REFERENCES factories(factory_id),
  FOREIGN KEY (performed_by) REFERENCES users(user_id),
  INDEX idx_factory_purity (factory_id, metal_purity),
  INDEX idx_type (txn_type),
  INDEX idx_date (performed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- balance_adjustments  (admin manual adjustments)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_adjustments (
  adjustment_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  factory_id       INT UNSIGNED NOT NULL,
  metal_purity     ENUM('10KT','14KT','18KT','925') NOT NULL,
  adjustment_grams DECIMAL(10,3) NOT NULL,
  reason           TEXT NOT NULL,
  adjusted_by      INT UNSIGNED NOT NULL,
  adjusted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (factory_id)  REFERENCES factories(factory_id),
  FOREIGN KEY (adjusted_by) REFERENCES users(user_id),
  INDEX idx_factory (factory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- open_pos  (imported from ERP via FTP)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS open_pos (
  po_id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_number        VARCHAR(50)   NOT NULL UNIQUE,
  vendor           VARCHAR(100),
  po_date          DATE,
  item             VARCHAR(100),
  kt               VARCHAR(10),
  unit_fgr         DECIMAL(10,3) DEFAULT 0.000,
  qty_ordered      INT           DEFAULT 0,
  qty_received     INT           DEFAULT 0,
  qty_open         INT           DEFAULT 0,
  total_open_fgr   DECIMAL(10,3) DEFAULT 0.000,
  image_filename   VARCHAR(255),
  is_active        TINYINT(1)    DEFAULT 1,
  last_imported_at DATETIME,
  INDEX idx_vendor (vendor),
  INDEX idx_kt (kt),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- ftp_import_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ftp_import_log (
  import_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  imported_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  triggered_by        INT UNSIGNED,
  records_upserted    INT DEFAULT 0,
  records_deactivated INT DEFAULT 0,
  status              ENUM('SUCCESS','FAILURE') NOT NULL,
  error_message       TEXT,
  FOREIGN KEY (triggered_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- audit_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  log_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED,
  action_type VARCHAR(50)  NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   INT UNSIGNED,
  old_value   JSON,
  new_value   JSON,
  notes       TEXT,
  ip_address  VARCHAR(45),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_user (user_id),
  INDEX idx_action (action_type),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- email_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  email_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient     VARCHAR(150) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  body          TEXT,
  sent_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('SENT','FAILED') NOT NULL,
  error_message TEXT,
  entity_type   VARCHAR(50),
  entity_id     INT UNSIGNED,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_date (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- system_settings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_by    INT UNSIGNED,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- shipment_counter  (atomic sequential number)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipment_counter (
  id         INT PRIMARY KEY DEFAULT 1,
  next_value INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────
-- Seed data
-- ─────────────────────────────────────────────
INSERT IGNORE INTO shipment_counter (id, next_value) VALUES (1, 1);

-- Default system settings (SMTP and FTP — fill in real values via Admin > Settings)
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('smtp_host',          ''),
  ('smtp_port',          '587'),
  ('smtp_user',          ''),
  ('smtp_password',      ''),
  ('smtp_from',          ''),
  ('ftp_host',           ''),
  ('ftp_port',           '21'),
  ('ftp_user',           ''),
  ('ftp_password',       ''),
  ('ftp_path',           '/open_pos.json'),
  ('ftp_poll_minutes',   '60'),
  ('ny_notification_emails', '');

-- Default admin user  (password: Admin@1234  — CHANGE IMMEDIATELY)
-- bcrypt hash of 'Admin@1234' with cost 12
INSERT IGNORE INTO users
  (first_name, last_name, email, password_hash, role, is_active)
VALUES
  ('Admin', 'User', 'admin@bigjewelry.com',
   '$2a$12$K8GpAL1p9.JL7RA8r.AkJuLTI8OCWB2OO7Qy08aVNDl0VWMbpjyS',
   'ADMIN', 1);
