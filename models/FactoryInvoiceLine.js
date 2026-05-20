const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FactoryInvoiceLine extends Model {}

FactoryInvoiceLine.init({
  line_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  invoice_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_purity: { type: DataTypes.ENUM('10KT','14KT','18KT','925'), allowNull: false },
  pieces:       { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  net_weight_g: { type: DataTypes.DECIMAL(10,3), allowNull: false, defaultValue: 0.000 },
  dollar_value: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'FactoryInvoiceLine',
  tableName: 'factory_invoice_lines',
  timestamps: false,
});

module.exports = FactoryInvoiceLine;
