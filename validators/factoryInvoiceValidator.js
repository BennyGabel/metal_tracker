const { body, validationResult } = require('express-validator');

const rules = [
  body('factory_id').notEmpty().withMessage('Factory is required.'),
  body('invoice_date').isDate().withMessage('Invoice date is required.'),
  body('invoice_number').notEmpty().withMessage('Invoice number is required.'),
  body('dollar_value').isFloat({ min: 0 }).withMessage('Dollar value must be a positive number.'),
];

const acceptRules = [
  body('lines').isArray({ min: 1 }).withMessage('At least one receipt line is required.'),
  body('lines.*.metal_purity').isIn(['10KT','14KT','18KT','925']).withMessage('Invalid metal purity.'),
  body('lines.*.net_weight_g').isFloat({ min: 0.001 }).withMessage('Net weight must be greater than 0.'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(' | '));
    return res.redirect('back');
  }
  next();
}

module.exports = { rules, acceptRules, validate };
