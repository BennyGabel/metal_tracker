CREATE TABLE IF NOT EXISTS metal_prices (
  price_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  price_date DATE         NOT NULL,
  metal      VARCHAR(20)  NOT NULL,
  price      DECIMAL(12,4) NOT NULL,
  updated_by INT UNSIGNED,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_date_metal (price_date, metal),
  FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_date  (price_date),
  INDEX idx_metal (metal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
