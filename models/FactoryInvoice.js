const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FactoryInvoice extends Model {}

FactoryInvoice.init({
  invoice_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  factory_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  invoice_date:    { type: DataTypes.DATEONLY, allowNull: false },
  invoice_number:  { type: DataTypes.STRING(100), allowNull: false },
  carrier:         { type: DataTypes.STRING(100) },
  tracking_number: { type: DataTypes.STRING(100) },
  dollar_value:    { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  status:          { type: DataTypes.ENUM('PENDING','ACCEPTED'), defaultValue: 'PENDING' },
  received_date:   { type: DataTypes.DATEONLY },
  received_by:     { type: DataTypes.INTEGER.UNSIGNED },
  created_by:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  created_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'FactoryInvoice',
  tableName: 'factory_invoices',
  timestamps: false,
});

module.exports = FactoryInvoice;
