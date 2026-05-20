const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {
  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}

User.init({
  user_id:       { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  first_name:    { type: DataTypes.STRING(50), allowNull: false },
  last_name:     { type: DataTypes.STRING(50), allowNull: false },
  email:         { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role:          { type: DataTypes.ENUM('ADMIN','OFFICE','VIEWER','FACTORY'), allowNull: false },
  factory_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  is_active:     { type: DataTypes.TINYINT, defaultValue: 1 },
  last_login_at: { type: DataTypes.DATE },
  created_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: false,
});

module.exports = User;
