const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FtpImportLog extends Model {}

FtpImportLog.init({
  import_id:           { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  imported_at:         { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  triggered_by:        { type: DataTypes.INTEGER.UNSIGNED },
  records_upserted:    { type: DataTypes.INTEGER, defaultValue: 0 },
  records_deactivated: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:              { type: DataTypes.ENUM('SUCCESS','FAILURE'), allowNull: false },
  error_message:       { type: DataTypes.TEXT },
}, {
  sequelize,
  modelName: 'FtpImportLog',
  tableName: 'ftp_import_log',
  timestamps: false,
});

module.exports = FtpImportLog;
