const { Factory } = require('../../models');
const balanceSvc = require('../../services/balanceService');
const auditSvc = require('../../services/auditService');

exports.list = async (req, res, next) => {
  try {
    const factories = await Factory.findAll({ order: [['factory_name','ASC']] });
    res.render('admin/factories/list', { title: 'Factory Management', factories });
  } catch (err) { next(err); }
};

exports.newForm = (req, res) => {
  res.render('admin/factories/form', { title: 'New Factory', factory: null, isEdit: false, purities: ['10KT','14KT','18KT','925'] });
};

exports.create = async (req, res, next) => {
  try {
    const { factory_code, factory_name, country, contact_name, contact_email, default_carrier, address, notes, us_abbr, terms } = req.body;
    const factory = await Factory.create({ factory_code, factory_name, country: country||'India', contact_name, contact_email, default_carrier: default_carrier||'FedEx', address, notes: notes||null, us_abbr: us_abbr||null, terms: terms||null, is_active: 1 });
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'FACTORY_CREATED', entityType: 'factory', entityId: factory.factory_id, ipAddress: req.ip });
    req.flash('success', `Factory "${factory_name}" created.`);
    res.redirect('/admin/factories');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Factory code already in use.');
      return res.redirect('/admin/factories/new');
    }
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const factory = await Factory.findByPk(req.params.id);
    if (!factory) return res.status(404).render('error', { title: 'Not Found', message: 'Factory not found.' });
    res.render('admin/factories/form', { title: `Edit Factory`, factory, isEdit: true, purities: ['10KT','14KT','18KT','925'] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const factory = await Factory.findByPk(req.params.id);
    if (!factory) return res.status(404).render('error', { title: 'Not Found', message: 'Factory not found.' });
    const { factory_code, factory_name, country, contact_name, contact_email, default_carrier, address, notes, us_abbr, terms } = req.body;
    await factory.update({ factory_code, factory_name, country, contact_name, contact_email, default_carrier, address, notes: notes||null, us_abbr: us_abbr||null, terms: terms||null, updated_at: new Date() });
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'FACTORY_UPDATED', entityType: 'factory', entityId: factory.factory_id, ipAddress: req.ip });
    req.flash('success', 'Factory updated.');
    res.redirect('/admin/factories');
  } catch (err) { next(err); }
};

exports.deactivate = async (req, res, next) => {
  try {
    await Factory.update({ is_active: 0, updated_at: new Date() }, { where: { factory_id: req.params.id } });
    req.flash('success', 'Factory deactivated.');
    res.redirect('/admin/factories');
  } catch (err) { next(err); }
};

exports.activate = async (req, res, next) => {
  try {
    await Factory.update({ is_active: 1, updated_at: new Date() }, { where: { factory_id: req.params.id } });
    req.flash('success', 'Factory activated.');
    res.redirect('/admin/factories');
  } catch (err) { next(err); }
};
