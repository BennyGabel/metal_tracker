const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class OpenPO extends Model {}

OpenPO.init({
  po_id:            { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  po_number:        { type: DataTypes.STRING(50), allowNull: false },
  vendor:           { type: DataTypes.STRING(100) },
  po_date:          { type: DataTypes.DATEONLY },
  item:             { type: DataTypes.STRING(100) },
  kt:               { type: DataTypes.STRING(10) },
  unit_fgr:         { type: DataTypes.DECIMAL(10,3), defaultValue: 0.000 },
  qty_ordered:      { type: DataTypes.INTEGER, defaultValue: 0 },
  qty_received:     { type: DataTypes.INTEGER, defaultValue: 0 },
  qty_open:         { type: DataTypes.INTEGER, defaultValue: 0 },
  total_open_fgr:   { type: DataTypes.DECIMAL(10,3), defaultValue: 0.000 },
  image_filename:   { type: DataTypes.STRING(255) },
  is_active:        { type: DataTypes.TINYINT, defaultValue: 1 },
  last_imported_at: { type: DataTypes.DATE },
  for_cust:         { type: DataTypes.STRING(1) },
  tranlineno:       { type: DataTypes.INTEGER},
  vpartno:          { type: DataTypes.STRING(15) },
  reqdate:          { type: DataTypes.DATEONLY },
  so_number:        { type: DataTypes.STRING(10) },

}, {
  sequelize,
  modelName: 'OpenPO',
  tableName: 'open_pos',
  timestamps: false,
  indexes: [{ unique: true, fields: ['po_number', 'item'] }],
});

module.exports = OpenPO;
