const ftp = require('basic-ftp');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { OpenPO, FtpImportLog, sequelize } = require('../models');
const settingsService = require('./settingsService');

const IMAGE_BASE = 'https://03ee8bc.netsolhost.com/posystem/files/images/';

async function _processRecords(records) {
  let upserted = 0;
  let deactivated = 0;
  const importedKeys = new Set(); // "po_number|item" composite keys

  await sequelize.transaction(async (t) => {
    for (const rec of records) {
      const qtyOpen = (rec.qty_ordered || 0) - (rec.qty_received || 0);
      const totalOpenFgr = parseFloat(((rec.unit_fgr || 0) * qtyOpen).toFixed(3));

      await OpenPO.upsert({
        po_number:        rec.po_number,
        vendor:           rec.vendor || null,
        po_date:          rec.po_date || null,
        item:             rec.item || null,
        kt:               rec.kt || null,
        unit_fgr:         parseFloat(rec.unit_fgr || 0),
        qty_ordered:      parseInt(rec.qty_ordered || 0),
        qty_received:     parseInt(rec.qty_received || 0),
        qty_open:         qtyOpen,
        total_open_fgr:   totalOpenFgr,
        image_filename:   rec.image || null,
        for_cust:         rec.for_cust    || null,
        tranlineno:       rec.tranlineno  ? parseInt(rec.tranlineno)  : null,
        vpartno:          rec.vpartno     || null,
        reqdate:          rec.reqdate     || null,
        so_number:        rec.so_number   || null,
        is_active:        1,
        last_imported_at: new Date(),
        for_cust:         rec.for_cust    || null,
        tranlineno:       parseInt(rec.tranlineno || 0),
        vpartno:          rec.vpartno     || null,
        reqdate:          rec.reqdate     || null,
        so_number:        rec.so_number   || null,
      }, { transaction: t });

      importedKeys.add(`${rec.po_number}|${rec.item || ''}`);
      upserted++;
    }

    const [updated] = await sequelize.query(
      `UPDATE open_pos SET is_active = 0
       WHERE is_active = 1
         AND CONCAT(po_number, '|', COALESCE(item, '')) NOT IN (:keys)`,
      { replacements: { keys: [...importedKeys] }, transaction: t }
    );
    deactivated = typeof updated === 'number' ? updated : 0;
  });

  return { upserted, deactivated };
}

async function runImport(triggeredByUserId) {
  const settings = await settingsService.getFtpSettings();

  if (!settings.ftp_host) {
    await FtpImportLog.create({
      imported_at: new Date(), triggered_by: triggeredByUserId || null,
      records_upserted: 0, records_deactivated: 0,
      status: 'FAILURE', error_message: 'FTP host not configured.',
    });
    return { success: false, message: 'FTP host not configured.' };
  }

  const client = new ftp.Client();
  const tmpFile = path.join(os.tmpdir(), `open_pos_${Date.now()}.json`);

  try {
    await client.access({
      host: settings.ftp_host,
      port: settings.ftp_port,
      user: settings.ftp_user,
      password: settings.ftp_password,
      secure: false,
    });

    await client.downloadTo(tmpFile, settings.ftp_path);
    client.close();

    const raw = fs.readFileSync(tmpFile, 'utf8');
    fs.unlinkSync(tmpFile);
    const records = JSON.parse(raw);

    const { upserted, deactivated } = await _processRecords(records);

    await FtpImportLog.create({
      imported_at: new Date(), triggered_by: triggeredByUserId || null,
      records_upserted: upserted, records_deactivated: deactivated,
      status: 'SUCCESS',
    });

    return { success: true, upserted, deactivated };
  } catch (err) {
    client.close();
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

    await FtpImportLog.create({
      imported_at: new Date(), triggered_by: triggeredByUserId || null,
      records_upserted: 0, records_deactivated: 0,
      status: 'FAILURE', error_message: err.message,
    });

    console.error('FTP import error:', err.message);
    return { success: false, message: err.message };
  }
}

async function runImportFromData(records, triggeredByUserId) {
  try {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('JSON must be a non-empty array of PO records.');
    }

    const { upserted, deactivated } = await _processRecords(records);

    await FtpImportLog.create({
      imported_at: new Date(), triggered_by: triggeredByUserId || null,
      records_upserted: upserted, records_deactivated: deactivated,
      status: 'SUCCESS',
    });

    return { success: true, upserted, deactivated };
  } catch (err) {
    await FtpImportLog.create({
      imported_at: new Date(), triggered_by: triggeredByUserId || null,
      records_upserted: 0, records_deactivated: 0,
      status: 'FAILURE', error_message: err.message,
    });

    return { success: false, message: err.message };
  }
}

module.exports = { runImport, runImportFromData, IMAGE_BASE };
