const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

router.use('/', require('./auth'));
router.use('/', requireLogin, require('./dashboard'));
router.use('/casting-shipments', requireLogin, require('./castingShipments'));
router.use('/factory-invoices', requireLogin, require('./factoryInvoices'));
router.use('/metal-balances', requireLogin, require('./metalBalances'));
router.use('/open-pos', requireLogin, require('./openPos'));
router.use('/metal-prices', requireLogin, require('./metalPrices'));
router.use('/reports', requireLogin, require('./reports'));
router.use('/admin', requireLogin, require('./admin/index'));

module.exports = router;
