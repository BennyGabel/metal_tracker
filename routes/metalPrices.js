const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/metalPriceController');
const { requireRole } = require('../middleware/auth');

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed.'));
    }
  },
});

router.get('/',            ctrl.index);
router.post('/',           requireRole('ADMIN', 'OFFICE'), ctrl.store);
router.post('/import-csv', requireRole('ADMIN', 'OFFICE'), uploadCsv.single('csvFile'), ctrl.importCsv);
router.put('/:id',         requireRole('ADMIN', 'OFFICE'), ctrl.update);
router.delete('/:id',      requireRole('ADMIN', 'OFFICE'), ctrl.destroy);

module.exports = router;
