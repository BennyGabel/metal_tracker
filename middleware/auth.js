function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        currentUser: req.session.user || null,
        csrfToken:   req.session.csrfToken || '',
      });
    }
    next();
  };
}

// Ensure a FACTORY user only accesses their own factory's data.
// Expects req.params.factoryId or req.body.factory_id to be present.
function requireOwnsFactory(req, res, next) {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  if (['ADMIN', 'OFFICE', 'VIEWER'].includes(user.role)) return next();

  // FACTORY role — enforce ownership
  const paramId = req.params.factoryId
    || req.body.factory_id
    || req.query.factory_id;

  if (paramId && parseInt(paramId) !== user.factory_id) {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You may only access data for your own factory.',
      currentUser: user || null,
      csrfToken:   req.session.csrfToken || '',
    });
  }
  next();
}

module.exports = { requireLogin, requireRole, requireOwnsFactory };
