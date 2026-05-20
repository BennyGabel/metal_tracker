require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

async function resetAdmin() {
  const password = 'Admin@1234';
  const hash = await bcrypt.hash(password, 12);

  await sequelize.authenticate();

  const [rows] = await sequelize.query(
    `UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?`,
    { replacements: [hash, 'admin@bigjewelry.com'] }
  );

  if (rows.affectedRows === 0) {
    // User doesn't exist — insert it
    await sequelize.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
       VALUES ('Admin', 'User', 'admin@bigjewelry.com', ?, 'ADMIN', 1)`,
      { replacements: [hash] }
    );
    console.log('Admin user created.');
  } else {
    console.log('Admin password reset successfully.');
  }

  console.log('Email:    admin@bigjewelry.com');
  console.log('Password: Admin@1234');

  await sequelize.close();
}

resetAdmin().catch(err => { console.error(err.message); process.exit(1); });
