const { CastingShipment, CastingShipmentLine, FactoryInvoice, FactoryInvoiceLine, Factory, User, BalanceTransaction, OpenPO } = require('../models');
const { Op } = require('sequelize');
const exportSvc = require('../services/exportService');

const CS_INCLUDE = [{ model: Factory, as: 'factory' }, { model: CastingShipmentLine, as: 'lines' }];
const FI_INCLUDE = [{ model: Factory, as: 'factory' }, { model: FactoryInvoiceLine, as: 'lines' }];

exports.index = (req, res) => {
  res.render('reports/index', { title: 'Reports' });
};

exports.castingShipments = async (req, res, next) => {
  try {
    const { factory_id, metal_type, status, from_date, to_date } = req.query;
    const user = req.session.user;
    const where = user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};
    if (factory_id) where.factory_id = factory_id;
    if (metal_type) where.metal_type = metal_type;
    if (status) where.status = status;
    if (from_date && to_date) where.shipment_date = { [Op.between]: [from_date, to_date] };

    const shipments = await CastingShipment.findAll({ where, include: CS_INCLUDE, order: [['shipment_date','DESC']] });
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('reports/castingShipments', { title: 'Report: Casting Shipments', shipments, factories, filters: req.query });
  } catch (err) { next(err); }
};

exports.castingShipmentsExport = async (req, res, next) => {
  try {
    const { factory_id, metal_type, status, from_date, to_date, fmt } = req.query;
    const where = {};
    if (factory_id) where.factory_id = factory_id;
    if (metal_type) where.metal_type = metal_type;
    if (status) where.status = status;
    if (from_date && to_date) where.shipment_date = { [Op.between]: [from_date, to_date] };
    const shipments = await CastingShipment.findAll({ where, include: CS_INCLUDE, order: [['shipment_date','DESC']] });

    if (fmt === 'pdf') {
      await exportSvc.castingShipmentsPdf(shipments, res);
    } else {
      const wb = await exportSvc.castingShipmentsExcel(shipments);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="casting_shipments_report.xlsx"');
      await wb.xlsx.write(res);
      res.end();
    }
  } catch (err) { next(err); }
};

exports.factoryInvoices = async (req, res, next) => {
  try {
    const { factory_id, status, from_date, to_date } = req.query;
    const user = req.session.user;
    const where = user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};
    if (factory_id) where.factory_id = factory_id;
    if (status) where.status = status;
    if (from_date && to_date) where.invoice_date = { [Op.between]: [from_date, to_date] };

    const invoices = await FactoryInvoice.findAll({ where, include: FI_INCLUDE, order: [['invoice_date','DESC']] });
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('reports/factoryInvoices', { title: 'Report: Factory Invoices', invoices, factories, filters: req.query });
  } catch (err) { next(err); }
};

exports.factoryInvoicesExport = async (req, res, next) => {
  try {
    const { factory_id, status, from_date, to_date } = req.query;
    const where = {};
    if (factory_id) where.factory_id = factory_id;
    if (status) where.status = status;
    if (from_date && to_date) where.invoice_date = { [Op.between]: [from_date, to_date] };
    const invoices = await FactoryInvoice.findAll({ where, include: FI_INCLUDE, order: [['invoice_date','DESC']] });
    const wb = await exportSvc.factoryInvoicesExcel(invoices);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="factory_invoices_report.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

exports.balanceStatement = async (req, res, next) => {
  try {
    const { factory_id } = req.query;
    const user = req.session.user;
    const fid = user.role === 'FACTORY' ? user.factory_id : (factory_id ? parseInt(factory_id) : null);
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    let factory = null;
    let transactions = [];

    if (fid) {
      factory = await Factory.findByPk(fid);
      transactions = await BalanceTransaction.findAll({
        where: { factory_id: fid },
        include: [{ model: User, as: 'performedBy', attributes: ['first_name','last_name'] }],
        order: [['performed_at','ASC']],
      });
    }

    res.render('reports/balanceStatement', { title: 'Report: Balance Statement', factory, transactions, factories, filters: req.query });
  } catch (err) { next(err); }
};

exports.balanceStatementExport = async (req, res, next) => {
  try {
    const { factory_id } = req.query;
    const factory = await Factory.findByPk(factory_id);
    if (!factory) { req.flash('error','Select a factory.'); return res.redirect('/reports/balance-statement'); }
    const transactions = await BalanceTransaction.findAll({ where: { factory_id }, order: [['performed_at','ASC']] });
    const wb = await exportSvc.balanceStatementExcel(factory, transactions);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="balance_statement_${factory.factory_code}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

exports.openPos = async (req, res, next) => {
  try {
    const { vendor, kt } = req.query;
    const where = { is_active: 1 };
    if (vendor) where.vendor = vendor;
    if (kt) where.kt = kt;
    const pos = await OpenPO.findAll({ where, order: [['po_date','DESC']] });
    const allPos = await OpenPO.findAll({ where: { is_active: 1 }, attributes: ['vendor','kt'], raw: true });
    const vendors = [...new Set(allPos.map(p => p.vendor).filter(Boolean))].sort();
    const kts     = [...new Set(allPos.map(p => p.kt).filter(Boolean))].sort();
    res.render('reports/openPos', { title: 'Report: Open POs', pos, vendors, kts, filters: req.query });
  } catch (err) { next(err); }
};

exports.openPosExport = async (req, res, next) => {
  try {
    const { vendor, kt } = req.query;
    const where = { is_active: 1 };
    if (vendor) where.vendor = vendor;
    if (kt) where.kt = kt;
    const pos = await OpenPO.findAll({ where, order: [['po_date','DESC']] });
    const wb = await exportSvc.openPosExcel(pos);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="open_pos_report.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
