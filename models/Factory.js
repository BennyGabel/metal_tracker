const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Factory extends Model {}

Factory.init({
  factory_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  factory_code:    { type: DataTypes.STRING(20), allowNull: false, unique: true },
  factory_name:    { type: DataTypes.STRING(100), allowNull: false },
  country:         { type: DataTypes.STRING(50), defaultValue: 'India' },
  contact_name:    { type: DataTypes.STRING(100) },
  contact_email:   { type: DataTypes.STRING(150) },
  default_carrier: { type: DataTypes.STRING(100), defaultValue: 'FedEx' },
  address:         { type: DataTypes.TEXT },
  notes:           { type: DataTypes.STRING(50) },
  us_abbr:         { type: DataTypes.STRING(20) },
  terms:           { type: DataTypes.STRING(20) },
  is_active:       { type: DataTypes.TINYINT, defaultValue: 1 },
  created_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'Factory',
  tableName: 'factories',
  timestamps: false,
});

module.exports = Factory;
