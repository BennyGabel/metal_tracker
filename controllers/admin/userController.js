const bcrypt = require('bcryptjs');
const { User, Factory } = require('../../models');
const auditSvc = require('../../services/auditService');

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [{ model: Factory, as: 'factory', attributes: ['factory_name'] }],
      order: [['last_name','ASC'],['first_name','ASC']],
    });
    res.render('admin/users/list', { title: 'User Management', users });
  } catch (err) { next(err); }
};

exports.newForm = async (req, res, next) => {
  try {
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('admin/users/form', { title: 'New User', user: null, factories, isEdit: false });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, factory_id } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      first_name, last_name, email: email.toLowerCase().trim(),
      password_hash: hash, role,
      factory_id: role === 'FACTORY' ? (factory_id || null) : null,
      is_active: 1,
    });
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'USER_CREATED', entityType: 'user', entityId: user.user_id, ipAddress: req.ip });
    req.flash('success', `User ${first_name} ${last_name} created.`);
    res.redirect('/admin/users');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Email address already in use.');
      return res.redirect('/admin/users/new');
    }
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found.' });
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('admin/users/form', { title: `Edit User`, user, factories, isEdit: true });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { first_name, last_name, email, role, factory_id } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found.' });
    await user.update({
      first_name, last_name,
      email: email.toLowerCase().trim(),
      role,
      factory_id: role === 'FACTORY' ? (factory_id || null) : null,
      updated_at: new Date(),
    });
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'USER_UPDATED', entityType: 'user', entityId: user.user_id, ipAddress: req.ip });
    req.flash('success', 'User updated.');
    res.redirect('/admin/users');
  } catch (err) { next(err); }
};

exports.deactivate = async (req, res, next) => {
  try {
    await User.update({ is_active: 0, updated_at: new Date() }, { where: { user_id: req.params.id } });
    req.flash('success', 'User deactivated.');
    res.redirect('/admin/users');
  } catch (err) { next(err); }
};

exports.activate = async (req, res, next) => {
  try {
    await User.update({ is_active: 1, updated_at: new Date() }, { where: { user_id: req.params.id } });
    req.flash('success', 'User activated.');
    res.redirect('/admin/users');
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hash = await bcrypt.hash(tempPassword, 12);
    await User.update({ password_hash: hash, updated_at: new Date() }, { where: { user_id: req.params.id } });
    req.flash('success', `Password reset. Temporary password: ${tempPassword} — share this securely with the user.`);
    res.redirect('/admin/users');
  } catch (err) { next(err); }
};
