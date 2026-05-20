ALTER TABLE casting_shipment_lines
  ADD COLUMN price_per_gram DECIMAL(10,4) NULL AFTER net_weight_g;
