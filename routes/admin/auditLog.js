const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/auditLogController');

router.get('/', ctrl.index);
router.get('/export', ctrl.exportExcel);

module.exports = router;
