const { CastingShipment, FactoryInvoice, Factory, MetalBalance, AuditLog, User, FtpImportLog, MetalPrice } = require('../models');
const { Op } = require('sequelize');

exports.index = async (req, res, next) => {
  const user = req.session.user;
  const factoryFilter = user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};

  try {
    const [
      openShipments,
      pendingInvoices,
      balances,
      recentActivity,
      lastImport,
      recentPrices,
    ] = await Promise.all([
      CastingShipment.count({ where: { ...factoryFilter, status: { [Op.in]: ['DRAFT','APPROVED','SHIPPED'] } } }),
      FactoryInvoice.count({ where: { ...factoryFilter, status: 'PENDING' } }),
      MetalBalance.findAll({
        include: [{ model: Factory, as: 'factory', attributes: ['factory_id','factory_name'], where: { is_active: 1 } }],
        ...(user.role === 'FACTORY' ? { where: { factory_id: user.factory_id } } : {}),
        order: [['factory', 'factory_name', 'ASC'], ['metal_purity', 'ASC']],
      }),
      AuditLog.findAll({
        limit: 10, order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['first_name','last_name'] }],
      }),
      FtpImportLog.findOne({ order: [['imported_at','DESC']] }),
      MetalPrice.findAll({ order: [['price_date', 'DESC'], ['metal', 'ASC']], limit: 200, raw: true }),
    ]);

    // Group balances by factory
    const balancesByFactory = {};
    for (const b of balances) {
      const fid = b.factory_id;
      if (!balancesByFactory[fid]) {
        balancesByFactory[fid] = { factory: b.factory, purities: {} };
      }
      balancesByFactory[fid].purities[b.metal_purity] = parseFloat(b.balance_grams);
    }

    // Latest price per metal (recentPrices is sorted DESC by date)
    const seenMetal = new Set();
    const metalPrices = [];
    for (const p of recentPrices) {
      if (!seenMetal.has(p.metal)) {
        seenMetal.add(p.metal);
        metalPrices.push(p);
      }
    }
    metalPrices.sort((a, b) => a.metal.localeCompare(b.metal));

    res.render('dashboard/index', {
      title: 'Dashboard',
      openShipments,
      pendingInvoices,
      balancesByFactory: Object.values(balancesByFactory),
      recentActivity,
      lastImport,
      metalPrices,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
