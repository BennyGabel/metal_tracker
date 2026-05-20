const bcrypt = require('bcryptjs');
const { User, Factory } = require('../models');
const auditService = require('../services/auditService');

exports.showLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', layout: 'layout/auth' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim(), is_active: 1 },
      include: [{ model: Factory, as: 'factory', attributes: ['factory_id','factory_name','factory_code'] }],
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    await user.update({ last_login_at: new Date() });

    req.session.user = {
      user_id:    user.user_id,
      first_name: user.first_name,
      last_name:  user.last_name,
      email:      user.email,
      role:       user.role,
      factory_id: user.factory_id || null,
      factory:    user.factory || null,
    };

    await auditService.log({
      userId: user.user_id, actionType: 'LOGIN',
      entityType: 'user', entityId: user.user_id,
      ipAddress: req.ip,
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Login error. Please try again.');
    res.redirect('/login');
  }
};

exports.logout = async (req, res) => {
  const userId = req.session.user?.user_id;
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

exports.showChangePassword = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('auth/changePassword', { title: 'Change Password' });
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.session.user.user_id;

  if (new_password !== confirm_password) {
    req.flash('error', 'New passwords do not match.');
    return res.redirect('/change-password');
  }
  if (new_password.length < 8) {
    req.flash('error', 'Password must be at least 8 characters.');
    return res.redirect('/change-password');
  }

  try {
    const user = await User.findByPk(userId);
    if (!(await bcrypt.compare(current_password, user.password_hash))) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/change-password');
    }
    const hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash: hash });
    req.flash('success', 'Password changed successfully.');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error changing password.');
    res.redirect('/change-password');
  }
};
