const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SystemSetting extends Model {}

SystemSetting.init({
  setting_key:   { type: DataTypes.STRING(100), primaryKey: true },
  setting_value: { type: DataTypes.TEXT },
  updated_by:    { type: DataTypes.INTEGER.UNSIGNED },
  updated_at:    { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'SystemSetting',
  tableName: 'system_settings',
  timestamps: false,
});

module.exports = SystemSetting;
