const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/openPoController');
const { requireRole } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json files are allowed.'));
    }
  },
});

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed.'));
    }
  },
});

router.get('/', ctrl.index);
router.post('/refresh', requireRole('ADMIN','OFFICE'), ctrl.refresh);
router.post('/upload-json', requireRole('ADMIN','OFFICE'), upload.single('jsonFile'), ctrl.uploadJson);
router.post('/upload-csv', requireRole('ADMIN','OFFICE'), uploadCsv.single('csvFile'), ctrl.uploadCsv);
router.get('/export/excel', ctrl.exportExcel);

module.exports = router;
