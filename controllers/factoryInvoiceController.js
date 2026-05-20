const { sequelize, FactoryInvoice, FactoryInvoiceLine, Factory, User } = require('../models');
const { Op } = require('sequelize');
const balanceSvc = require('../services/balanceService');
const emailSvc = require('../services/emailService');
const auditSvc = require('../services/auditService');
const exportSvc = require('../services/exportService');

const INCLUDE = [
  { model: Factory, as: 'factory' },
  { model: FactoryInvoiceLine, as: 'lines' },
  { model: User, as: 'createdBy', attributes: ['first_name','last_name'] },
  { model: User, as: 'receivedBy', attributes: ['first_name','last_name'] },
];

function factoryScope(user) {
  return user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};
}

exports.list = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, status, from_date, to_date, invoice_number } = req.query;
    const where = { ...factoryScope(user) };
    if (factory_id) where.factory_id = factory_id;
    if (status) where.status = status;
    if (invoice_number) where.invoice_number = { [Op.like]: `%${invoice_number}%` };
    if (from_date && to_date) where.invoice_date = { [Op.between]: [from_date, to_date] };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await FactoryInvoice.findAndCountAll({
      where, include: INCLUDE, order: [['invoice_date','DESC'],['invoice_id','DESC']],
      limit, offset,
    });

    const factories = user.role === 'FACTORY' ? [] : await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });

    res.render('factoryInvoices/list', {
      title: 'Factory Invoices',
      invoices: rows, count, page, limit,
      totalPages: Math.ceil(count / limit),
      filters: req.query, factories,
    });
  } catch (err) { next(err); }
};

exports.newForm = async (req, res, next) => {
  try {
    const user = req.session.user;
    let factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    if (user.role === 'FACTORY') factories = factories.filter(f => f.factory_id === user.factory_id);
    res.render('factoryInvoices/form', { title: 'New Factory Invoice', invoice: null, factories, isEdit: false });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, invoice_date, invoice_number, carrier, tracking_number, dollar_value } = req.body;
    const factory = await Factory.findByPk(factory_id);
    const invoice = await FactoryInvoice.create({
      factory_id, invoice_date, invoice_number,
      carrier: carrier || (factory ? factory.default_carrier : ''),
      tracking_number, dollar_value: parseFloat(dollar_value)||0,
      status: 'PENDING', created_by: user.user_id,
    });
    await auditSvc.log({ userId: user.user_id, actionType: 'INVOICE_CREATED', entityType: 'factory_invoice', entityId: invoice.invoice_id, ipAddress: req.ip });
    req.flash('success', `Invoice ${invoice_number} created.`);
    res.redirect(`/factory-invoices/${invoice.invoice_id}`);
  } catch (err) { next(err); }
};

exports.detail = async (req, res, next) => {
  try {
    const user = req.session.user;
    const invoice = await FactoryInvoice.findByPk(req.params.id, { include: INCLUDE });
    if (!invoice) return res.status(404).render('error', { title: 'Not Found', message: 'Invoice not found.' });
    if (user.role === 'FACTORY' && invoice.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }
    res.render('factoryInvoices/detail', { title: `Invoice ${invoice.invoice_number}`, invoice });
  } catch (err) { next(err); }
};

exports.editForm = async (req, res, next) => {
  try {
    const invoice = await FactoryInvoice.findByPk(req.params.id, { include: INCLUDE });
    if (!invoice || invoice.status !== 'PENDING') {
      req.flash('error', 'Only PENDING invoices can be edited.');
      return res.redirect('/factory-invoices');
    }
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('factoryInvoices/form', { title: `Edit Invoice ${invoice.invoice_number}`, invoice, factories, isEdit: true });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const user = req.session.user;
    const invoice = await FactoryInvoice.findByPk(req.params.id);
    if (!invoice || invoice.status !== 'PENDING') {
      req.flash('error', 'Only PENDING invoices can be edited.');
      return res.redirect('/factory-invoices');
    }
    const { invoice_date, invoice_number, carrier, tracking_number, dollar_value } = req.body;
    await invoice.update({ invoice_date, invoice_number, carrier, tracking_number, dollar_value: parseFloat(dollar_value)||0, updated_at: new Date() });
    req.flash('success', 'Invoice updated.');
    res.redirect(`/factory-invoices/${invoice.invoice_id}`);
  } catch (err) { next(err); }
};

exports.accept = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { received_date, lines } = req.body;
    const invoice = await FactoryInvoice.findByPk(req.params.id, { include: [{ model: Factory, as: 'factory' }] });

    if (!invoice || invoice.status !== 'PENDING') {
      req.flash('error', 'Only PENDING invoices can be accepted.');
      return res.redirect(`/factory-invoices/${req.params.id}`);
    }

    await sequelize.transaction(async (t) => {
      await invoice.update({
        status: 'ACCEPTED',
        received_date: received_date || new Date().toISOString().split('T')[0],
        received_by: user.user_id,
        updated_at: new Date(),
      }, { transaction: t });

      if (lines && lines.length) {
        await FactoryInvoiceLine.bulkCreate(
          lines.map(l => ({
            invoice_id: invoice.invoice_id,
            metal_purity: l.metal_purity,
            pieces: parseInt(l.pieces)||0,
            net_weight_g: parseFloat(l.net_weight_g)||0,
            dollar_value: parseFloat(l.dollar_value)||0,
          })), { transaction: t }
        );

        for (const l of lines) {
          await balanceSvc.deductBalance({
            factoryId: invoice.factory_id,
            purity: l.metal_purity,
            grams: parseFloat(l.net_weight_g)||0,
            txnType: 'INVOICE_OUT',
            referenceId: invoice.invoice_id,
            referenceType: 'factory_invoice',
            notes: `Invoice ${invoice.invoice_number} accepted by NY`,
            userId: user.user_id,
            transaction: t,
          });
        }
      }
    });

    await emailSvc.notifyInvoiceAccepted(invoice, invoice.factory).catch(console.error);
    await auditSvc.log({ userId: user.user_id, actionType: 'INVOICE_ACCEPTED', entityType: 'factory_invoice', entityId: invoice.invoice_id, oldValue: { status: 'PENDING' }, newValue: { status: 'ACCEPTED' }, ipAddress: req.ip });
    req.flash('success', 'Invoice accepted. Metal balances updated.');
    res.redirect(`/factory-invoices/${invoice.invoice_id}`);
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const invoices = await FactoryInvoice.findAll({ include: INCLUDE, order: [['invoice_date','DESC']] });
    const wb = await exportSvc.factoryInvoicesExcel(invoices);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="factory_invoices.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
