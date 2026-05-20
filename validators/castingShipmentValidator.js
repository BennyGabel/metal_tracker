const { body, validationResult } = require('express-validator');

const rules = [
  body('factory_id').notEmpty().withMessage('Factory is required.'),
  body('metal_type').isIn(['GOLD','SILVER']).withMessage('Metal type must be GOLD or SILVER.'),
  body('dollar_value').isFloat({ min: 0 }).withMessage('Dollar value must be a positive number.'),
  body('lines').isArray({ min: 1 }).withMessage('At least one detail line is required.'),
  body('lines.*.metal_purity').isIn(['10KT','14KT','18KT','925']).withMessage('Invalid metal purity.'),
  body('lines.*.pieces').isInt({ min: 1 }).withMessage('Pieces must be a positive integer.'),
  body('lines.*.net_weight_g').isFloat({ min: 0.001 }).withMessage('Net weight must be greater than 0.'),
  body('lines.*.dollar_value').isFloat({ min: 0 }).withMessage('Line value must be a positive number.'),
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
