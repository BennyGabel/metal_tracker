const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BalanceTransaction extends Model {}

BalanceTransaction.init({
  txn_id:         { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  factory_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  metal_purity:   { type: DataTypes.ENUM('10KT','14KT','18KT','925'), allowNull: false },
  txn_type:       { type: DataTypes.ENUM('CASTING_IN','INVOICE_OUT','MANUAL_ADJUSTMENT','OPENING_BALANCE'), allowNull: false },
  grams_change:   { type: DataTypes.DECIMAL(10,3), allowNull: false },
  balance_after:  { type: DataTypes.DECIMAL(10,3), allowNull: false },
  reference_id:   { type: DataTypes.INTEGER.UNSIGNED },
  reference_type: { type: DataTypes.STRING(30) },
  notes:          { type: DataTypes.TEXT },
  performed_by:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  performed_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'BalanceTransaction',
  tableName: 'balance_transactions',
  timestamps: false,
});

module.exports = BalanceTransaction;
