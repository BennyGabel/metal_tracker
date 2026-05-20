const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class MetalPrice extends Model {}

MetalPrice.init({
  price_id:   { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  price_date: { type: DataTypes.DATEONLY, allowNull: false },
  metal:      { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['GOLD', '925']] } },
  price:      { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  updated_by: { type: DataTypes.INTEGER.UNSIGNED },
  created_at: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'MetalPrice',
  tableName: 'metal_prices',
  timestamps: false,
  indexes: [{ unique: true, fields: ['price_date', 'metal'] }],
});

module.exports = MetalPrice;
