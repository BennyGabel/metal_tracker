const { MetalBalance, BalanceTransaction, BalanceAdjustment, Factory, User } = require('../models');
const balanceSvc = require('../services/balanceService');
const auditSvc = require('../services/auditService');
const ExcelJS = require('exceljs');

exports.index = async (req, res, next) => {
  try {
    const user = req.session.user;
    const factoryWhere = user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};

    const balances = await MetalBalance.findAll({
      include: [{ model: Factory, as: 'factory', where: { is_active: 1 } }],
      ...(user.role === 'FACTORY' ? { where: { factory_id: user.factory_id } } : {}),
      order: [['factory', 'factory_name', 'ASC'], ['metal_purity', 'ASC']],
    });

    // Group by factory
    const byFactory = {};
    for (const b of balances) {
      if (!byFactory[b.factory_id]) {
        byFactory[b.factory_id] = { factory: b.factory, balances: {} };
      }
      byFactory[b.factory_id].balances[b.metal_purity] = {
        grams: parseFloat(b.balance_grams),
        updated: b.last_updated_at,
      };
    }

    // Recent adjustments
    const adjustments = await BalanceAdjustment.findAll({
      include: [
        { model: Factory, as: 'factory', attributes: ['factory_name'] },
        { model: User, as: 'adjustedBy', attributes: ['first_name','last_name'] },
      ],
      order: [['adjusted_at', 'DESC']],
      limit: 20,
    });

    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });

    res.render('metalBalances/index', {
      title: 'Metal Balances',
      factoryGroups: Object.values(byFactory),
      adjustments,
      factories,
      purities: ['10KT','14KT','18KT','925'],
    });
  } catch (err) { next(err); }
};

exports.adjust = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, metal_purity, adjustment_grams, reason } = req.body;
    await balanceSvc.adjustBalance({
      factoryId: parseInt(factory_id),
      purity: metal_purity,
      grams: parseFloat(adjustment_grams),
      reason,
      userId: user.user_id,
    });
    await auditSvc.log({ userId: user.user_id, actionType: 'BALANCE_ADJUSTED', entityType: 'metal_balance', notes: reason, ipAddress: req.ip });
    req.flash('success', 'Balance adjustment saved.');
    res.redirect('/metal-balances');
  } catch (err) { next(err); }
};

exports.setOpening = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, balances } = req.body;
    for (const purity of ['10KT','14KT','18KT','925']) {
      const grams = parseFloat(balances[purity] || 0);
      if (grams > 0) {
        await balanceSvc.setOpeningBalance({ factoryId: parseInt(factory_id), purity, grams, userId: user.user_id });
      }
    }
    req.flash('success', 'Opening balances saved.');
    res.redirect('/metal-balances');
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const balances = await MetalBalance.findAll({
      include: [{ model: Factory, as: 'factory' }],
      order: [['factory', 'factory_name', 'ASC'], ['metal_purity', 'ASC']],
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Metal Balances');
    ws.columns = [
      { header: 'Factory', key: 'factory', width: 25 },
      { header: 'Purity', key: 'purity', width: 10 },
      { header: 'Balance (g)', key: 'grams', width: 15 },
      { header: 'Last Updated', key: 'updated', width: 20 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const b of balances) {
      ws.addRow({ factory: b.factory?.factory_name, purity: b.metal_purity, grams: parseFloat(b.balance_grams), updated: b.last_updated_at });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="metal_balances.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
