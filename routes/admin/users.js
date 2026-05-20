const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/userController');
const { createRules, editRules, validate } = require('../../validators/userValidator');

router.get('/', ctrl.list);
router.get('/new', ctrl.newForm);
router.post('/', createRules, validate, ctrl.create);
router.get('/:id/edit', ctrl.editForm);
router.put('/:id', editRules, validate, ctrl.update);
router.post('/:id/deactivate', ctrl.deactivate);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/reset-password', ctrl.resetPassword);

module.exports = router;
