const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/metalBalanceController');
const { requireRole } = require('../middleware/auth');
const { rules, validate } = require('../validators/balanceAdjustmentValidator');

router.get('/', ctrl.index);
router.post('/adjust', requireRole('ADMIN'), rules, validate, ctrl.adjust);
router.post('/opening', requireRole('ADMIN'), ctrl.setOpening);
router.get('/export/excel', ctrl.exportExcel);

module.exports = router;
