const { MetalPrice } = require('../models');
const { Op } = require('sequelize');
const { parse: parseCsv } = require('csv-parse/sync');

const ALLOWED_METALS = ['GOLD', '925'];

exports.index = async (req, res, next) => {
  try {
    const { from, to, metal } = req.query;
    const where = {};
    if (from) where.price_date = { ...where.price_date, [Op.gte]: from };
    if (to)   where.price_date = { ...where.price_date, [Op.lte]: to };
    if (metal && ALLOWED_METALS.includes(metal)) where.metal = metal;

    const prices = await MetalPrice.findAll({
      where,
      order: [['price_date', 'DESC'], ['metal', 'ASC']],
    });

    res.render('metalPrices/index', {
      title: 'Metal Prices',
      prices,
      filters: req.query,
    });
  } catch (err) { next(err); }
};

exports.store = async (req, res, next) => {
  try {
    const { price_date, metal, price } = req.body;
    const m = (metal || '').trim().toUpperCase();
    if (!price_date || !m || !price) {
      req.flash('error', 'Date, metal, and price are all required.');
      return res.redirect('/metal-prices');
    }
    if (!ALLOWED_METALS.includes(m)) {
      req.flash('error', 'Metal must be GOLD or 925.');
      return res.redirect('/metal-prices');
    }
    await MetalPrice.upsert({
      price_date,
      metal:      m,
      price:      parseFloat(price),
      updated_by: req.session.user.user_id,
      created_at: new Date(),
    });
    req.flash('success', 'Metal price saved.');
    res.redirect('/metal-prices');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await MetalPrice.findByPk(req.params.id);
    if (!row) {
      req.flash('error', 'Record not found.');
      return res.redirect('/metal-prices');
    }
    const { price_date, metal, price } = req.body;
    const m = (metal || '').trim().toUpperCase();
    if (!ALLOWED_METALS.includes(m)) {
      req.flash('error', 'Metal must be GOLD or 925.');
      return res.redirect('/metal-prices');
    }
    await row.update({
      price_date,
      metal:      m,
      price:      parseFloat(price),
      updated_by: req.session.user.user_id,
    });
    req.flash('success', 'Metal price updated.');
    res.redirect('/metal-prices');
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const row = await MetalPrice.findByPk(req.params.id);
    if (row) await row.destroy();
    req.flash('success', 'Metal price deleted.');
    res.redirect('/metal-prices');
  } catch (err) { next(err); }
};

exports.importCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash('error', 'No CSV file selected.');
      return res.redirect('/metal-prices');
    }

    let rows;
    try {
      let csvText = req.file.buffer.toString('utf8');
      if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);
      rows = parseCsv(csvText, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    } catch (e) {
      req.flash('error', 'Invalid CSV: ' + e.message);
      return res.redirect('/metal-prices');
    }

    const col = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
      }
      return '';
    };

    let imported = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r     = rows[i];
      const date  = col(r, 'date', 'Date', 'DATE', 'price_date', 'Price Date');
      const metal = col(r, 'metal', 'Metal', 'METAL').trim().toUpperCase();
      const raw   = col(r, 'price', 'Price', 'PRICE');
      const price = parseFloat(raw);

      if (!date || !metal)               { errors.push(`Row ${i + 2}: missing date or metal.`); continue; }
      if (!ALLOWED_METALS.includes(metal)) { errors.push(`Row ${i + 2}: metal "${metal}" must be GOLD or 925.`); continue; }
      if (isNaN(price))                  { errors.push(`Row ${i + 2}: invalid price "${raw}".`); continue; }

      await MetalPrice.upsert({
        price_date: date,
        metal,
        price,
        updated_by: req.session.user.user_id,
        created_at: new Date(),
      });
      imported++;
    }

    if (errors.length) {
      req.flash('error', `${errors.length} row(s) skipped: ${errors.slice(0, 3).join(' ')}`);
    }
    req.flash('success', `Imported ${imported} price record(s).`);
    res.redirect('/metal-prices');
  } catch (err) { next(err); }
};
