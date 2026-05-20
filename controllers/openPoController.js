const { OpenPO, FtpImportLog } = require('../models');
const { Op } = require('sequelize');
const { parse: parseCsv } = require('csv-parse/sync');
const ftpService = require('../services/ftpService');
const exportSvc = require('../services/exportService');
const settingsService = require('../services/settingsService');

exports.index = async (req, res, next) => {
  try {
    const user = req.session.user;
    const factoryVendor = user.role === 'FACTORY' ? (user.factory?.factory_name || null) : null;

    const { vendor, item, kt, search } = req.query;
    const where = { is_active: 1 };

    // FACTORY users are locked to their own factory's vendor name
    if (factoryVendor) {
      where.vendor = factoryVendor;
    } else if (vendor) {
      where.vendor = vendor;
    }

    if (item) where.item = item;
    if (kt) where.kt = kt;
    if (search) {
      where[Op.or] = [
        { po_number: { [Op.like]: `%${search}%` } },
        { vendor: { [Op.like]: `%${search}%` } },
        { item: { [Op.like]: `%${search}%` } },
      ];
    }

    const pos = await OpenPO.findAll({ where, order: [['po_date','DESC'],['po_number','ASC']] });
    const lastImport = await FtpImportLog.findOne({ order: [['imported_at','DESC']] });

    // Build filter dropdown options — scoped to visible records for FACTORY users
    const allPos = await OpenPO.findAll({
      where: factoryVendor ? { is_active: 1, vendor: factoryVendor } : { is_active: 1 },
      attributes: ['vendor','item','kt'], raw: true,
    });
    const vendors = [...new Set(allPos.map(p => p.vendor).filter(Boolean))].sort();
    const items   = [...new Set(allPos.map(p => p.item).filter(Boolean))].sort();
    const kts     = [...new Set(allPos.map(p => p.kt).filter(Boolean))].sort();

    const IMAGE_BASE = (await settingsService.get('po_image_base_url')) || ftpService.IMAGE_BASE;
    

    res.render('openPos/index', {
      title: 'Open Purchase Orders',
      pos, lastImport, vendors, items, kts, filters: req.query, IMAGE_BASE,
    });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await ftpService.runImport(req.session.user.user_id);
    if (result.success) {
      req.flash('success', `Import complete. ${result.upserted} records updated, ${result.deactivated} deactivated.`);
    } else {
      req.flash('error', `Import failed: ${result.message}`);
    }
    res.redirect('/open-pos');
  } catch (err) { next(err); }
};

exports.uploadJson = async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash('error', 'No JSON file selected.');
      return res.redirect('/open-pos');
    }

    let records;
    try {
      records = JSON.parse(req.file.buffer.toString('utf8'));
    } catch (e) {
      req.flash('error', 'Invalid JSON: ' + e.message);
      return res.redirect('/open-pos');
    }

    const result = await ftpService.runImportFromData(records, req.session.user.user_id);
    if (result.success) {
      req.flash('success', `Import complete. ${result.upserted} records updated, ${result.deactivated} deactivated.`);
    } else {
      req.flash('error', `Import failed: ${result.message}`);
    }
    res.redirect('/open-pos');
  } catch (err) { next(err); }
};

exports.uploadCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash('error', 'No CSV file selected.');
      return res.redirect('/open-pos');
    }

    let rows;
    try {
      // Strip UTF-8 BOM (Excel exports on Windows often include it)
      let csvText = req.file.buffer.toString('utf8');
      if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

      rows = parseCsv(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      req.flash('error', 'Invalid CSV: ' + e.message);
      return res.redirect('/open-pos');
    }

    // Normalise column names — accept snake_case or common human labels
    const col = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
      }
      return '';
    };

    const records = rows.map(r => ({
      po_number:    col(r, 'po_number', 'PO Number', 'PO#', 'po#'),
      vendor:       col(r, 'vendor', 'Vendor'),
      po_date:      col(r, 'po_date', 'PO Date', 'Date'),
      item:         col(r, 'item', 'Item'),
      kt:           col(r, 'kt', 'KT', 'Karat'),
      unit_fgr:     col(r, 'unit_fgr', 'Unit FGR', 'unit fgr') || 0,
      qty_ordered:  col(r, 'qty_ordered', 'Qty Ordered', 'Ordered') || 0,
      qty_received: col(r, 'qty_received', 'Qty Received', 'Received') || 0,
      qty_open    : col(r, 'qty_open', 'Qty Open', 'Open') || 0,
      total_open_fgr: col(r, 'total_open_fgr', 'Total Open FGR', 'Total FGR') || 0,
      image:        col(r, 'image', 'Image'),
      for_cust:     col(r, 'for_cust', 'For Customer?'),
      tranlineno:   col(r, 'tranlineno', 'PO Line'),
      vpartno:      col(r, 'vpartno', 'Vendor Part #'),
      reqdate:      col(r, 'reqdate', 'Required Date'),
      so_number:    col(r, 'so_number', 'SO#'),
    }));

    const result = await ftpService.runImportFromData(records, req.session.user.user_id);
    if (result.success) {
      req.flash('success', `Import complete. ${result.upserted} records updated, ${result.deactivated} deactivated.`);
    } else {
      req.flash('error', `Import failed: ${result.message}`);
    }
    res.redirect('/open-pos');
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const pos = await OpenPO.findAll({ where: { is_active: 1 }, order: [['po_date','DESC']] });
    const wb = await exportSvc.openPosExcel(pos);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="open_pos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
