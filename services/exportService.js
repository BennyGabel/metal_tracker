const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const PURITIES = ['10KT', '14KT', '18KT', '925'];

// ── Excel helpers ────────────────────────────────────────────
function styleHeader(ws, row, cols) {
  const r = ws.getRow(row);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
  r.alignment = { vertical: 'middle', horizontal: 'center' };
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width || 15;
  });
  r.commit();
}

// ── Casting Shipments ────────────────────────────────────────
async function castingShipmentsExcel(shipments) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Casting Shipments');
  const cols = [
    { header: 'Shipment #', key: 'num', width: 22 },
    { header: 'Factory', key: 'factory', width: 25 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Metal', key: 'metal', width: 10 },
    { header: 'Purity', key: 'purity', width: 10 },
    { header: 'Pieces', key: 'pieces', width: 10 },
    { header: 'Net Grams', key: 'grams', width: 14 },
    { header: 'Value (USD)', key: 'value', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Tracking #', key: 'tracking', width: 22 },
  ];
  ws.columns = cols;
  styleHeader(ws, 1, cols);

  for (const s of shipments) {
    const lines = s.lines && s.lines.length ? s.lines : [{}];
    for (const line of lines) {
      ws.addRow({
        num: s.shipment_number,
        factory: s.factory ? s.factory.factory_name : '',
        date: s.shipment_date,
        metal: s.metal_type,
        purity: line.metal_purity || '',
        pieces: line.pieces || '',
        grams: line.net_weight_g || '',
        value: s.dollar_value,
        status: s.status,
        tracking: s.tracking_number || '',
      });
    }
  }
  return wb;
}

async function castingShipmentsPdf(shipments, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="casting_shipments.pdf"');
  doc.pipe(res);

  doc.fontSize(16).text('Casting Shipments Report', { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  const headers = ['Shipment #', 'Factory', 'Date', 'Metal', 'Pieces', 'Net Grams', 'Value', 'Status'];
  const colWidths = [120, 120, 70, 50, 50, 70, 70, 70];
  _pdfTable(doc, headers, colWidths, shipments.map(s => [
    s.shipment_number,
    s.factory ? s.factory.factory_name : '',
    s.shipment_date,
    s.metal_type,
    s.lines ? s.lines.reduce((a, l) => a + (l.pieces || 0), 0) : '',
    s.lines ? s.lines.reduce((a, l) => a + parseFloat(l.net_weight_g || 0), 0).toFixed(3) : '',
    `$${parseFloat(s.dollar_value || 0).toFixed(2)}`,
    s.status,
  ]));
  doc.end();
}

// ── Factory Invoices ─────────────────────────────────────────
async function factoryInvoicesExcel(invoices) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Factory Invoices');
  const cols = [
    { header: 'Invoice #', key: 'inv', width: 20 },
    { header: 'Factory', key: 'factory', width: 25 },
    { header: 'Invoice Date', key: 'date', width: 14 },
    { header: 'Purity', key: 'purity', width: 10 },
    { header: 'Pieces', key: 'pieces', width: 10 },
    { header: 'Net Grams', key: 'grams', width: 14 },
    { header: 'Value (USD)', key: 'value', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Received Date', key: 'recvd', width: 14 },
  ];
  ws.columns = cols;
  styleHeader(ws, 1, cols);
  for (const inv of invoices) {
    const lines = inv.lines && inv.lines.length ? inv.lines : [{}];
    for (const line of lines) {
      ws.addRow({
        inv: inv.invoice_number,
        factory: inv.factory ? inv.factory.factory_name : '',
        date: inv.invoice_date,
        purity: line.metal_purity || '',
        pieces: line.pieces || '',
        grams: line.net_weight_g || '',
        value: inv.dollar_value,
        status: inv.status,
        recvd: inv.received_date || '',
      });
    }
  }
  return wb;
}

// ── Balance Statement ────────────────────────────────────────
async function balanceStatementExcel(factory, transactions) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Balance Statement');
  const cols = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Purity', key: 'purity', width: 10 },
    { header: 'Change (g)', key: 'change', width: 14 },
    { header: 'Balance After (g)', key: 'balance', width: 18 },
    { header: 'Reference', key: 'ref', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  ws.columns = cols;
  ws.getRow(1).values = [`Balance Statement — ${factory.factory_name}`];
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow([]);
  ws.columns = cols;
  styleHeader(ws, 3, cols);

  for (const txn of transactions) {
    ws.addRow({
      date: txn.performed_at,
      type: txn.txn_type,
      purity: txn.metal_purity,
      change: txn.grams_change,
      balance: txn.balance_after,
      ref: txn.reference_type ? `${txn.reference_type} #${txn.reference_id}` : '',
      notes: txn.notes || '',
    });
  }
  return wb;
}

// ── Open POs ─────────────────────────────────────────────────
async function openPosExcel(pos) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Open POs');
  const cols = [
    { header: 'PO #', key: 'po', width: 16 },
    { header: 'Vendor', key: 'vendor', width: 20 },
    { header: 'PO Date', key: 'date', width: 14 },
    { header: 'Item', key: 'item', width: 20 },
    { header: 'KT', key: 'kt', width: 8 },
    { header: 'Unit FGR', key: 'fgr', width: 12 },
    { header: 'Qty Ord.', key: 'ord', width: 10 },
    { header: 'Qty Rcvd.', key: 'rcvd', width: 10 },
    { header: 'Qty Open', key: 'open', width: 10 },
    { header: 'Total Open FGR', key: 'totalFgr', width: 16 },
  ];
  ws.columns = cols;
  styleHeader(ws, 1, cols);
  for (const p of pos) {
    ws.addRow({
      po: p.po_number, vendor: p.vendor, date: p.po_date, item: p.item,
      kt: p.kt, fgr: p.unit_fgr, ord: p.qty_ordered,
      rcvd: p.qty_received, open: p.qty_open, totalFgr: p.total_open_fgr,
    });
  }
  // Totals row
  const lastRow = ws.lastRow.number + 1;
  const totals = pos.reduce((a, p) => {
    a.ord += p.qty_ordered || 0;
    a.rcvd += p.qty_received || 0;
    a.open += p.qty_open || 0;
    a.totalFgr += parseFloat(p.total_open_fgr || 0);
    return a;
  }, { ord: 0, rcvd: 0, open: 0, totalFgr: 0 });
  const tr = ws.addRow({ po: 'TOTALS', ord: totals.ord, rcvd: totals.rcvd, open: totals.open, totalFgr: totals.totalFgr.toFixed(3) });
  tr.font = { bold: true };
  return wb;
}

// ── PDF helper ───────────────────────────────────────────────
function _pdfTable(doc, headers, colWidths, rows) {
  const startX = doc.page.margins.left;
  let y = doc.y;
  const rowH = 20;

  // Header row
  doc.font('Helvetica-Bold').fontSize(8);
  let x = startX;
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], rowH).fillAndStroke('#2C3E50', '#2C3E50');
    doc.fillColor('white').text(h, x + 2, y + 5, { width: colWidths[i] - 4, lineBreak: false });
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row, ri) => {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    x = startX;
    const bg = ri % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowH).fillAndStroke(bg, '#DEE2E6');
      doc.fillColor('black').text(String(cell ?? ''), x + 2, y + 5, { width: colWidths[i] - 4, lineBreak: false });
      x += colWidths[i];
    });
    y += rowH;
  });
  doc.y = y + 5;
}

module.exports = {
  castingShipmentsExcel,
  castingShipmentsPdf,
  factoryInvoicesExcel,
  balanceStatementExcel,
  openPosExcel,
  _pdfTable,
};
