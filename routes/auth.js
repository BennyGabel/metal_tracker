const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.get('/login', ctrl.showLogin);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/change-password', ctrl.showChangePassword);
router.post('/change-password', ctrl.changePassword);

module.exports = router;
