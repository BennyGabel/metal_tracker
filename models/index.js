const sequelize = require('../config/database');
const Factory = require('./Factory');
const User = require('./User');
const CastingShipment = require('./CastingShipment');
const CastingShipmentLine = require('./CastingShipmentLine');
const FactoryInvoice = require('./FactoryInvoice');
const FactoryInvoiceLine = require('./FactoryInvoiceLine');
const MetalBalance = require('./MetalBalance');
const BalanceTransaction = require('./BalanceTransaction');
const BalanceAdjustment = require('./BalanceAdjustment');
const OpenPO = require('./OpenPO');
const MetalPrice = require('./MetalPrice');
const FtpImportLog = require('./FtpImportLog');
const AuditLog = require('./AuditLog');
const EmailLog = require('./EmailLog');
const SystemSetting = require('./SystemSetting');
const ShipmentCounter = require('./ShipmentCounter');

// Factory associations
Factory.hasMany(User,              { foreignKey: 'factory_id', as: 'users' });
Factory.hasMany(CastingShipment,   { foreignKey: 'factory_id', as: 'castingShipments' });
Factory.hasMany(FactoryInvoice,    { foreignKey: 'factory_id', as: 'factoryInvoices' });
Factory.hasMany(MetalBalance,      { foreignKey: 'factory_id', as: 'metalBalances' });
Factory.hasMany(BalanceTransaction,{ foreignKey: 'factory_id', as: 'balanceTransactions' });
Factory.hasMany(BalanceAdjustment, { foreignKey: 'factory_id', as: 'balanceAdjustments' });

// User associations
User.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });

// CastingShipment associations
CastingShipment.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });
CastingShipment.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
CastingShipment.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });
CastingShipment.hasMany(CastingShipmentLine, { foreignKey: 'shipment_id', as: 'lines' });

// CastingShipmentLine associations
CastingShipmentLine.belongsTo(CastingShipment, { foreignKey: 'shipment_id', as: 'shipment' });

// FactoryInvoice associations
FactoryInvoice.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });
FactoryInvoice.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
FactoryInvoice.belongsTo(User, { foreignKey: 'received_by', as: 'receivedBy' });
FactoryInvoice.hasMany(FactoryInvoiceLine, { foreignKey: 'invoice_id', as: 'lines' });

// FactoryInvoiceLine associations
FactoryInvoiceLine.belongsTo(FactoryInvoice, { foreignKey: 'invoice_id', as: 'invoice' });

// MetalBalance associations
MetalBalance.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });

// BalanceTransaction associations
BalanceTransaction.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });
BalanceTransaction.belongsTo(User,    { foreignKey: 'performed_by', as: 'performedBy' });

// BalanceAdjustment associations
BalanceAdjustment.belongsTo(Factory, { foreignKey: 'factory_id', as: 'factory' });
BalanceAdjustment.belongsTo(User,    { foreignKey: 'adjusted_by', as: 'adjustedBy' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// FtpImportLog associations
FtpImportLog.belongsTo(User, { foreignKey: 'triggered_by', as: 'triggeredBy' });

module.exports = {
  sequelize,
  Factory,
  User,
  CastingShipment,
  CastingShipmentLine,
  FactoryInvoice,
  FactoryInvoiceLine,
  MetalBalance,
  BalanceTransaction,
  BalanceAdjustment,
  OpenPO,
  MetalPrice,
  FtpImportLog,
  AuditLog,
  EmailLog,
  SystemSetting,
  ShipmentCounter,
};
