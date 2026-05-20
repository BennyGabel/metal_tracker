const crypto = require('crypto');
const { SystemSetting } = require('../models');

const ALGO = 'aes-256-cbc';
const KEY = Buffer.from((process.env.SETTINGS_ENCRYPTION_KEY || '').padEnd(32, '0').slice(0, 32));
const ENCRYPTED_KEYS = ['smtp_password', 'ftp_password', 'note02'];

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encBuf = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
  } catch {
    return text;
  }
}

async function getAll() {
  const rows = await SystemSetting.findAll();
  const result = {};
  for (const row of rows) {
    result[row.setting_key] = ENCRYPTED_KEYS.includes(row.setting_key)
      ? decrypt(row.setting_value)
      : row.setting_value;
  }
  return result;
}

async function get(key) {
  const row = await SystemSetting.findByPk(key);
  if (!row) return null;
  return ENCRYPTED_KEYS.includes(key) ? decrypt(row.setting_value) : row.setting_value;
}

async function set(key, value, userId) {
  const storedValue = ENCRYPTED_KEYS.includes(key) ? encrypt(value) : value;
  await SystemSetting.upsert({ setting_key: key, setting_value: storedValue, updated_by: userId });
}

async function setMany(pairs, userId) {
  for (const [key, value] of Object.entries(pairs)) {
    await set(key, value, userId);
  }
}

async function getSmtpSettings() {
  const all = await getAll();
  return {
    smtp_host: all.smtp_host,
    smtp_port: all.smtp_port || '587',
    smtp_user: all.smtp_user,
    smtp_password: all.smtp_password,
    smtp_from: all.smtp_from,
  };
}

async function getFtpSettings() {
  const all = await getAll();
  return {
    ftp_host: all.ftp_host,
    ftp_port: parseInt(all.ftp_port || '21'),
    ftp_user: all.ftp_user,
    ftp_password: all.ftp_password,
    ftp_path: all.ftp_path || '/open_pos.json',
    ftp_poll_minutes: parseInt(all.ftp_poll_minutes || '60'),
  };
}

async function getNyEmails() {
  const override = await get('ny_notification_emails');
  if (override && override.trim()) {
    return override.split(',').map(e => e.trim()).filter(Boolean);
  }
  // Fall back to all active ADMIN/OFFICE users
  const { User } = require('../models');
  const users = await User.findAll({
    where: { role: ['ADMIN', 'OFFICE'], is_active: 1 },
    attributes: ['email'],
  });
  return users.map(u => u.email);
}

module.exports = { getAll, get, set, setMany, getSmtpSettings, getFtpSettings, getNyEmails };
