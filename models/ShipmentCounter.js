const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ShipmentCounter extends Model {}

ShipmentCounter.init({
  id:         { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  next_value: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
}, {
  sequelize,
  modelName: 'ShipmentCounter',
  tableName: 'shipment_counter',
  timestamps: false,
});

module.exports = ShipmentCounter;
