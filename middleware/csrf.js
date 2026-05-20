const crypto = require('crypto');

module.exports = function csrfMiddleware(req, res, next) {
  // Generate token once per session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Validate on mutating requests.
  // req.query._csrf is used as a fallback for multipart file-upload forms,
  // where req.body is not yet parsed when this middleware runs (Multer runs later).
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.body._csrf || req.headers['x-csrf-token'] || req.query._csrf;
    if (token !== req.session.csrfToken) {
      return res.status(403).render('error', {
        title: 'Invalid Request',
        message: 'Security token mismatch. Please refresh and try again.',
        currentUser: req.session.user || null,
        csrfToken:   req.session.csrfToken || '',
      });
    }
  }
  next();
};
