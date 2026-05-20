const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class CastingShipment extends Model {}

CastingShipment.init({
  shipment_id:     { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  shipment_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  factory_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_type:      { type: DataTypes.ENUM('GOLD','SILVER'), allowNull: false },
  metal_lock:      { type: DataTypes.DECIMAL(12,4), allowNull: true },
  shipment_date:   { type: DataTypes.DATEONLY, allowNull: false },
  dollar_value:    { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  carrier:         { type: DataTypes.STRING(100), defaultValue: 'FedEx' },
  tracking_number: { type: DataTypes.STRING(100) },
  status:          { type: DataTypes.ENUM('DRAFT','APPROVED','REJECTED','SHIPPED','RECEIVED'), defaultValue: 'DRAFT' },
  rejection_notes: { type: DataTypes.TEXT },
  approved_by:     { type: DataTypes.INTEGER.UNSIGNED },
  approved_at:     { type: DataTypes.DATE },
  shipped_at:      { type: DataTypes.DATE },
  received_at:     { type: DataTypes.DATE },
  created_by:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  created_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'CastingShipment',
  tableName: 'casting_shipments',
  timestamps: false,
});

module.exports = CastingShipment;
