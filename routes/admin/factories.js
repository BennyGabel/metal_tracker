const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/factoryController');
const { rules, validate } = require('../../validators/factoryValidator');

router.get('/', ctrl.list);
router.get('/new', ctrl.newForm);
router.post('/', rules, validate, ctrl.create);
router.get('/:id/edit', ctrl.editForm);
router.put('/:id', rules, validate, ctrl.update);
router.post('/:id/deactivate', ctrl.deactivate);
router.post('/:id/activate', ctrl.activate);

module.exports = router;
