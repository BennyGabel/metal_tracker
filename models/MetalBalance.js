const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class MetalBalance extends Model {}

MetalBalance.init({
  balance_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  factory_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_purity:    { type: DataTypes.ENUM('10KT','14KT','18KT','925'), allowNull: false },
  balance_grams:   { type: DataTypes.DECIMAL(10,3), defaultValue: 0.000 },
  last_updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'MetalBalance',
  tableName: 'metal_balances',
  timestamps: false,
});

module.exports = MetalBalance;
