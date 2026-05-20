const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/castingShipmentController');
const { requireRole } = require('../middleware/auth');
const { rules, validate } = require('../validators/castingShipmentValidator');

const CAN_EDIT = requireRole('ADMIN', 'OFFICE');
const FACTORY_OR_ABOVE = requireRole('ADMIN', 'OFFICE', 'FACTORY');

router.get('/', ctrl.list);
router.get('/new', CAN_EDIT, ctrl.newForm);
router.post('/', CAN_EDIT, rules, validate, ctrl.create);
router.get('/:id', ctrl.detail);
router.get('/:id/edit', CAN_EDIT, ctrl.editForm);
router.put('/:id', CAN_EDIT, rules, validate, ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.destroy);

// Status actions
router.post('/:id/submit',  CAN_EDIT, ctrl.submit);
router.post('/:id/approve', FACTORY_OR_ABOVE, ctrl.approve);
router.post('/:id/reject',  FACTORY_OR_ABOVE, ctrl.reject);
router.post('/:id/ship',    CAN_EDIT, ctrl.ship);
router.post('/:id/receive', FACTORY_OR_ABOVE, ctrl.receive);

// Commercial Invoice (DRAFT, APPROVED, RECEIVED only)
router.get('/:id/commercial-invoice', ctrl.commercialInvoice);

// Export
router.get('/export/excel', ctrl.exportExcel);
router.get('/export/pdf',   ctrl.exportPdf);

module.exports = router;
