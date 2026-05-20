const { body, validationResult } = require('express-validator');

const rules = [
  body('factory_id').notEmpty().withMessage('Factory is required.'),
  body('metal_purity').isIn(['10KT','14KT','18KT','925']).withMessage('Invalid metal purity.'),
  body('adjustment_grams').isFloat().not().equals('0').withMessage('Adjustment grams cannot be zero.'),
  body('reason').notEmpty().withMessage('Reason is required.'),
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
