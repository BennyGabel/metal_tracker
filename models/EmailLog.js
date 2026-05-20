const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class EmailLog extends Model {}

EmailLog.init({
  email_id:      { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  recipient:     { type: DataTypes.STRING(150), allowNull: false },
  subject:       { type: DataTypes.STRING(255), allowNull: false },
  body:          { type: DataTypes.TEXT },
  sent_at:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status:        { type: DataTypes.ENUM('SENT','FAILED'), allowNull: false },
  error_message: { type: DataTypes.TEXT },
  entity_type:   { type: DataTypes.STRING(50) },
  entity_id:     { type: DataTypes.INTEGER.UNSIGNED },
}, {
  sequelize,
  modelName: 'EmailLog',
  tableName: 'email_log',
  timestamps: false,
});

module.exports = EmailLog;
