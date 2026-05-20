const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AuditLog extends Model {}

AuditLog.init({
  log_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id:     { type: DataTypes.INTEGER.UNSIGNED },
  action_type: { type: DataTypes.STRING(50), allowNull: false },
  entity_type: { type: DataTypes.STRING(50), allowNull: false },
  entity_id:   { type: DataTypes.INTEGER.UNSIGNED },
  old_value:   { type: DataTypes.JSON },
  new_value:   { type: DataTypes.JSON },
  notes:       { type: DataTypes.TEXT },
  ip_address:  { type: DataTypes.STRING(45) },
  created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_log',
  timestamps: false,
});

module.exports = AuditLog;
