const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BalanceAdjustment extends Model {}

BalanceAdjustment.init({
  adjustment_id:    { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  factory_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_purity:     { type: DataTypes.ENUM('10KT','14KT','18KT','925'), allowNull: false },
  adjustment_grams: { type: DataTypes.DECIMAL(10,3), allowNull: false },
  reason:           { type: DataTypes.TEXT, allowNull: false },
  adjusted_by:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  adjusted_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'BalanceAdjustment',
  tableName: 'balance_adjustments',
  timestamps: false,
});

module.exports = BalanceAdjustment;
