-- Allow multiple line items per PO number.
-- Previously po_number was UNIQUE; now the unique key is (po_number, item).
ALTER TABLE open_pos DROP INDEX po_number;
ALTER TABLE open_pos ADD UNIQUE KEY uq_po_number_item (po_number, item);
