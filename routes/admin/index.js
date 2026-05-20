const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');

router.use(requireRole('ADMIN'));

router.use('/users',     require('./users'));
router.use('/factories', require('./factories'));
router.use('/settings',  require('./settings'));
router.use('/audit-log', require('./auditLog'));

module.exports = router;
