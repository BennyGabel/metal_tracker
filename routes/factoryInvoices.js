const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/factoryInvoiceController');
const { requireRole } = require('../middleware/auth');
const { rules, acceptRules, validate } = require('../validators/factoryInvoiceValidator');

const CAN_EDIT = requireRole('ADMIN', 'OFFICE', 'FACTORY');
const CAN_ACCEPT = requireRole('ADMIN', 'OFFICE');

router.get('/', ctrl.list);
router.get('/new', CAN_EDIT, ctrl.newForm);
router.post('/', CAN_EDIT, rules, validate, ctrl.create);
router.get('/:id', ctrl.detail);
router.get('/:id/edit', CAN_EDIT, ctrl.editForm);
router.put('/:id', CAN_EDIT, rules, validate, ctrl.update);

// Accept (PENDING → ACCEPTED)
router.post('/:id/accept', CAN_ACCEPT, acceptRules, validate, ctrl.accept);

// Export
router.get('/export/excel', ctrl.exportExcel);

module.exports = router;
