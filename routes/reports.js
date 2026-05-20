const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');

router.get('/', ctrl.index);
router.get('/casting-shipments', ctrl.castingShipments);
router.get('/casting-shipments/export', ctrl.castingShipmentsExport);
router.get('/factory-invoices', ctrl.factoryInvoices);
router.get('/factory-invoices/export', ctrl.factoryInvoicesExport);
router.get('/balance-statement', ctrl.balanceStatement);
router.get('/balance-statement/export', ctrl.balanceStatementExport);
router.get('/open-pos', ctrl.openPos);
router.get('/open-pos/export', ctrl.openPosExport);

module.exports = router;
