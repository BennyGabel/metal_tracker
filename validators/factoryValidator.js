const { body, validationResult } = require('express-validator');

const rules = [
  body('factory_code').notEmpty().withMessage('Factory code is required.'),
  body('factory_name').notEmpty().withMessage('Factory name is required.'),
  body('contact_email').optional({ checkFalsy: true }).isEmail().withMessage('Contact email must be valid.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(' | '));
    return res.redirect('back');
  }
  next();
}

module.exports = { rules, validate };
