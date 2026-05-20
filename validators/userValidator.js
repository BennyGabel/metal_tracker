const { body, validationResult } = require('express-validator');

const createRules = [
  body('first_name').notEmpty().withMessage('First name is required.'),
  body('last_name').notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['ADMIN','OFFICE','VIEWER','FACTORY']).withMessage('Invalid role.'),
];

const editRules = [
  body('first_name').notEmpty().withMessage('First name is required.'),
  body('last_name').notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('role').isIn(['ADMIN','OFFICE','VIEWER','FACTORY']).withMessage('Invalid role.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(' | '));
    return res.redirect('back');
  }
  next();
}

module.exports = { createRules, editRules, validate };
