const { sequelize, CastingShipment, CastingShipmentLine, Factory, User, MetalPrice } = require('../models');
const { Op } = require('sequelize');
const shipmentNumberSvc = require('../services/shipmentNumberService');
const balanceSvc = require('../services/balanceService');
const emailSvc = require('../services/emailService');
const auditSvc = require('../services/auditService');
const exportSvc = require('../services/exportService');
const settingsSvc = require('../services/settingsService');

const INCLUDE = [
  { model: Factory, as: 'factory' },
  { model: CastingShipmentLine, as: 'lines' },
  { model: User, as: 'createdBy', attributes: ['first_name','last_name'] },
  { model: User, as: 'approvedBy', attributes: ['first_name','last_name'] },
];

function factoryScope(user) {
  return user.role === 'FACTORY' ? { factory_id: user.factory_id } : {};
}

exports.list = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, metal_type, status, from_date, to_date, shipment_number } = req.query;
    const where = { ...factoryScope(user) };
    if (factory_id) where.factory_id = factory_id;
    if (metal_type) where.metal_type = metal_type;
    if (status) where.status = status;
    if (shipment_number) where.shipment_number = { [Op.like]: `%${shipment_number}%` };
    if (from_date && to_date) where.shipment_date = { [Op.between]: [from_date, to_date] };
    else if (from_date) where.shipment_date = { [Op.gte]: from_date };
    else if (to_date) where.shipment_date = { [Op.lte]: to_date };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await CastingShipment.findAndCountAll({
      where, include: INCLUDE, order: [['shipment_date','DESC'],['shipment_id','DESC']],
      limit, offset,
    });

    const factories = user.role === 'FACTORY' ? [] : await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });

    res.render('castingShipments/list', {
      title: 'Casting Shipments',
      shipments: rows, count, page, limit,
      totalPages: Math.ceil(count / limit),
      filters: req.query, factories,
    });
  } catch (err) { next(err); }
};

exports.newForm = async (req, res, next) => {
  try {
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    const metalType = req.query.type === 'SILVER' ? 'SILVER' : 'GOLD';
    const priceMetal = metalType === 'GOLD' ? 'GOLD' : '925';
    const latestPrice = await MetalPrice.findOne({ where: { metal: priceMetal }, order: [['price_date','DESC'],['price_id','DESC']] });
    const defaultMetalLock = latestPrice ? parseFloat(latestPrice.price) : null;
    res.render('castingShipments/form', {
      title: `New ${metalType === 'GOLD' ? 'Gold' : 'Silver'} Shipment`,
      shipment: null, factories, metalType, isEdit: false, defaultMetalLock,
    });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { factory_id, metal_type, metal_lock, dollar_value, carrier, lines } = req.body;
    const shipment_number = await shipmentNumberSvc.generateShipmentNumber();

    const shipment = await CastingShipment.create({
      shipment_number, factory_id, metal_type,
      metal_lock: metal_lock !== '' && metal_lock != null ? parseFloat(metal_lock) : null,
      shipment_date: new Date().toISOString().split('T')[0],
      dollar_value: parseFloat(dollar_value) || 0,
      carrier: carrier || 'FedEx',
      status: 'DRAFT', created_by: user.user_id,
    });

    if (lines && lines.length) {
      await CastingShipmentLine.bulkCreate(
        lines.map(l => ({ shipment_id: shipment.shipment_id, metal_purity: l.metal_purity, pieces: parseInt(l.pieces)||0, net_weight_g: parseFloat(l.net_weight_g)||0, price_per_gram: l.price_per_gram ? parseFloat(l.price_per_gram) : null, dollar_value: parseFloat(l.dollar_value)||0 }))
      );
    }

    await auditSvc.log({ userId: user.user_id, actionType: 'SHIPMENT_CREATED', entityType: 'casting_shipment', entityId: shipment.shipment_id, ipAddress: req.ip });
    req.flash('success', `Shipment ${shipment_number} created.`);
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.detail = async (req, res, next) => {
  try {
    const user = req.session.user;
    const shipment = await CastingShipment.findByPk(req.params.id, { include: INCLUDE });
    if (!shipment) return res.status(404).render('error', { title: 'Not Found', message: 'Shipment not found.' });
    if (user.role === 'FACTORY' && shipment.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }
    res.render('castingShipments/detail', { title: `Shipment ${shipment.shipment_number}`, shipment });
  } catch (err) { next(err); }
};

exports.editForm = async (req, res, next) => {
  try {
    const shipment = await CastingShipment.findByPk(req.params.id, { include: INCLUDE });
    if (!shipment || shipment.status !== 'DRAFT') {
      req.flash('error', 'Only DRAFT shipments can be edited.');
      return res.redirect('/casting-shipments');
    }
    const factories = await Factory.findAll({ where: { is_active: 1 }, order: [['factory_name','ASC']] });
    res.render('castingShipments/form', {
      title: `Edit Shipment ${shipment.shipment_number}`,
      shipment, factories, metalType: shipment.metal_type, isEdit: true,
    });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const user = req.session.user;
    const shipment = await CastingShipment.findByPk(req.params.id);
    if (!shipment || shipment.status !== 'DRAFT') {
      req.flash('error', 'Only DRAFT shipments can be edited.');
      return res.redirect('/casting-shipments');
    }

    const { metal_lock, dollar_value, carrier, lines } = req.body;
    const old = shipment.toJSON();
    await shipment.update({
      metal_lock: metal_lock !== '' && metal_lock != null ? parseFloat(metal_lock) : null,
      dollar_value: parseFloat(dollar_value)||0, carrier: carrier||'FedEx', updated_at: new Date(),
    });
    await CastingShipmentLine.destroy({ where: { shipment_id: shipment.shipment_id } });
    if (lines && lines.length) {
      await CastingShipmentLine.bulkCreate(
        lines.map(l => ({ shipment_id: shipment.shipment_id, metal_purity: l.metal_purity, pieces: parseInt(l.pieces)||0, net_weight_g: parseFloat(l.net_weight_g)||0, price_per_gram: l.price_per_gram ? parseFloat(l.price_per_gram) : null, dollar_value: parseFloat(l.dollar_value)||0 }))
      );
    }

    await auditSvc.log({ userId: user.user_id, actionType: 'SHIPMENT_UPDATED', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: old, ipAddress: req.ip });
    req.flash('success', 'Shipment updated.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const shipment = await CastingShipment.findByPk(req.params.id);
    if (!shipment || shipment.status !== 'DRAFT') {
      req.flash('error', 'Only DRAFT shipments can be deleted.');
      return res.redirect('/casting-shipments');
    }
    await shipment.destroy();
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'SHIPMENT_DELETED', entityType: 'casting_shipment', entityId: req.params.id, ipAddress: req.ip });
    req.flash('success', 'Shipment deleted.');
    res.redirect('/casting-shipments');
  } catch (err) { next(err); }
};

exports.submit = async (req, res, next) => {
  try {
    const shipment = await CastingShipment.findByPk(req.params.id, { include: [{ model: Factory, as: 'factory' }] });
    if (!shipment || !['DRAFT','REJECTED'].includes(shipment.status)) {
      req.flash('error', 'Shipment cannot be submitted in its current status.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    await shipment.update({ status: 'DRAFT', rejection_notes: null, updated_at: new Date() });
    await emailSvc.notifyShipmentSubmitted(shipment, shipment.factory).catch(console.error);
    await auditSvc.log({ userId: req.session.user.user_id, actionType: 'STATUS_CHANGE', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: { status: 'DRAFT' }, newValue: { status: 'DRAFT', note: 'Submitted for approval' }, ipAddress: req.ip });
    req.flash('success', 'Factory notified for approval.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const user = req.session.user;
    const shipment = await CastingShipment.findByPk(req.params.id, { include: [{ model: Factory, as: 'factory' }] });
    if (!shipment || shipment.status !== 'DRAFT') {
      req.flash('error', 'Only DRAFT shipments can be approved.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    if (user.role === 'FACTORY' && shipment.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }
    await shipment.update({ status: 'APPROVED', approved_by: user.user_id, approved_at: new Date(), updated_at: new Date() });
    await emailSvc.notifyShipmentApproved(shipment, shipment.factory).catch(console.error);
    await auditSvc.log({ userId: user.user_id, actionType: 'STATUS_CHANGE', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: { status: 'DRAFT' }, newValue: { status: 'APPROVED' }, ipAddress: req.ip });
    req.flash('success', 'Shipment approved. NY office has been notified.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { rejection_notes } = req.body;
    const shipment = await CastingShipment.findByPk(req.params.id, { include: [{ model: Factory, as: 'factory' }] });
    if (!shipment || shipment.status !== 'DRAFT') {
      req.flash('error', 'Cannot reject a shipment in its current status.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    if (user.role === 'FACTORY' && shipment.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }
    await shipment.update({ status: 'REJECTED', rejection_notes: rejection_notes || '', updated_at: new Date() });
    await emailSvc.notifyShipmentRejected(shipment, shipment.factory).catch(console.error);
    await auditSvc.log({ userId: user.user_id, actionType: 'STATUS_CHANGE', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: { status: 'DRAFT' }, newValue: { status: 'REJECTED', rejection_notes }, ipAddress: req.ip });
    req.flash('success', 'Shipment rejected. NY office has been notified.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.ship = async (req, res, next) => {
  try {
    const user = req.session.user;
    const { tracking_number } = req.body;
    if (!tracking_number || !tracking_number.trim()) {
      req.flash('error', 'Tracking number is required.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    const shipment = await CastingShipment.findByPk(req.params.id);
    if (!shipment || shipment.status !== 'APPROVED') {
      req.flash('error', 'Only APPROVED shipments can be marked as shipped.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    await shipment.update({ status: 'SHIPPED', tracking_number: tracking_number.trim(), shipped_at: new Date(), updated_at: new Date() });
    await auditSvc.log({ userId: user.user_id, actionType: 'STATUS_CHANGE', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: { status: 'APPROVED' }, newValue: { status: 'SHIPPED', tracking_number }, ipAddress: req.ip });
    req.flash('success', 'Tracking number saved. Shipment marked as Shipped.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.receive = async (req, res, next) => {
  try {
    const user = req.session.user;
    const shipment = await CastingShipment.findByPk(req.params.id, {
      include: [{ model: CastingShipmentLine, as: 'lines' }, { model: Factory, as: 'factory' }],
    });
    if (!shipment || shipment.status !== 'SHIPPED') {
      req.flash('error', 'Only SHIPPED shipments can be marked as received.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    if (user.role === 'FACTORY' && shipment.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }

    await sequelize.transaction(async (t) => {
      await shipment.update({ status: 'RECEIVED', received_at: new Date(), updated_at: new Date() }, { transaction: t });

      for (const line of shipment.lines) {
        await balanceSvc.addBalance({
          factoryId: shipment.factory_id,
          purity: line.metal_purity,
          grams: parseFloat(line.net_weight_g),
          txnType: 'CASTING_IN',
          referenceId: shipment.shipment_id,
          referenceType: 'casting_shipment',
          notes: `Casting shipment ${shipment.shipment_number} received`,
          userId: user.user_id,
          transaction: t,
        });
      }
    });

    await emailSvc.notifyShipmentReceived(shipment, shipment.factory).catch(console.error);
    await auditSvc.log({ userId: user.user_id, actionType: 'STATUS_CHANGE', entityType: 'casting_shipment', entityId: shipment.shipment_id, oldValue: { status: 'SHIPPED' }, newValue: { status: 'RECEIVED' }, ipAddress: req.ip });
    req.flash('success', 'Shipment marked as Received. Metal balances updated.');
    res.redirect(`/casting-shipments/${shipment.shipment_id}`);
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const shipments = await CastingShipment.findAll({ include: INCLUDE, order: [['shipment_date','DESC']] });
    const wb = await exportSvc.castingShipmentsExcel(shipments);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="casting_shipments.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

exports.exportPdf = async (req, res, next) => {
  try {
    const shipments = await CastingShipment.findAll({ include: INCLUDE, order: [['shipment_date','DESC']] });
    await exportSvc.castingShipmentsPdf(shipments, res);
  } catch (err) { next(err); }
};

exports.commercialInvoice = async (req, res, next) => {
  try {
    const user = req.session.user;
    const shipment = await CastingShipment.findByPk(req.params.id, { include: INCLUDE });
    if (!shipment) return res.status(404).render('error', { title: 'Not Found', message: 'Shipment not found.' });
    if (user.role === 'FACTORY' && shipment.factory_id !== user.factory_id) {
      return res.status(403).render('error', { title: 'Access Denied', message: 'Access denied.' });
    }
    if (!['DRAFT', 'APPROVED', 'RECEIVED'].includes(shipment.status)) {
      req.flash('error', 'Commercial invoice is only available for DRAFT, APPROVED, or RECEIVED shipments.');
      return res.redirect(`/casting-shipments/${req.params.id}`);
    }
    const settings = await settingsSvc.getAll();
    res.render('castingShipments/commercialInvoice', {
      layout: false,
      title: `Commercial Invoice – ${shipment.shipment_number}`,
      shipment,
      settings,
    });
  } catch (err) { next(err); }
};
