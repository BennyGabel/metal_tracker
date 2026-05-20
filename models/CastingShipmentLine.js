const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class CastingShipmentLine extends Model {}

CastingShipmentLine.init({
  line_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  shipment_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_purity: { type: DataTypes.ENUM('10KT','14KT','18KT','925'), allowNull: false },
  pieces:       { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  net_weight_g:   { type: DataTypes.DECIMAL(10,3), allowNull: false, defaultValue: 0.000 },
  price_per_gram: { type: DataTypes.DECIMAL(10,4), allowNull: true },
  dollar_value:   { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'CastingShipmentLine',
  tableName: 'casting_shipment_lines',
  timestamps: false,
});

module.exports = CastingShipmentLine;
