const nodemailer = require('nodemailer');
const settingsService = require('../services/settingsService');

let _transporter = null;

async function getTransporter() {
  const settings = await settingsService.getSmtpSettings();
  _transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587'),
    secure: parseInt(settings.smtp_port) === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_password },
  });
  return _transporter;
}

module.exports = { getTransporter };
