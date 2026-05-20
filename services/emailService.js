const { getTransporter } = require('../config/mailer');
const { EmailLog } = require('../models');
const settingsService = require('./settingsService');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

async function send({ to, subject, html, entityType, entityId }) {
  let status = 'FAILED';
  let errorMessage = null;
  try {
    const transporter = await getTransporter();
    const settings = await settingsService.getSmtpSettings();
    await transporter.sendMail({ from: settings.smtp_from, to, subject, html });
    status = 'SENT';
  } catch (err) {
    errorMessage = err.message;
    console.error('Email send error:', err.message);
  }

  await EmailLog.create({
    recipient: Array.isArray(to) ? to.join(', ') : to,
    subject, body: html, sent_at: new Date(),
    status, error_message: errorMessage,
    entity_type: entityType || null, entity_id: entityId || null,
  });
}

async function notifyShipmentSubmitted(shipment, factory) {
  const to = factory.contact_email;
  if (!to) return;
  await send({
    to,
    subject: `New Casting Shipment Awaiting Approval — ${shipment.shipment_number}`,
    html: `
      <p>A new casting shipment has been created and requires your approval.</p>
      <table border="1" cellpadding="4" cellspacing="0">
        <tr><td><b>Shipment #</b></td><td>${shipment.shipment_number}</td></tr>
        <tr><td><b>Factory</b></td><td>${factory.factory_name}</td></tr>
        <tr><td><b>Metal Type</b></td><td>${shipment.metal_type}</td></tr>
        <tr><td><b>Date</b></td><td>${shipment.shipment_date}</td></tr>
        <tr><td><b>Total Value</b></td><td>$${parseFloat(shipment.dollar_value).toFixed(2)}</td></tr>
      </table>
      <p><a href="${BASE_URL}/casting-shipments/${shipment.shipment_id}">View Shipment in Portal</a></p>`,
    entityType: 'casting_shipment', entityId: shipment.shipment_id,
  });
}

async function notifyShipmentApproved(shipment, factory) {
  const nyEmails = await settingsService.getNyEmails();
  if (!nyEmails.length) return;
  await send({
    to: nyEmails,
    subject: `Casting Shipment ${shipment.shipment_number} Approved by ${factory.factory_name}`,
    html: `
      <p>Shipment <b>${shipment.shipment_number}</b> has been approved by ${factory.factory_name}.</p>
      <p>Please enter a tracking number to mark it as Shipped.</p>
      <p><a href="${BASE_URL}/casting-shipments/${shipment.shipment_id}">View Shipment</a></p>`,
    entityType: 'casting_shipment', entityId: shipment.shipment_id,
  });
}

async function notifyShipmentRejected(shipment, factory) {
  const nyEmails = await settingsService.getNyEmails();
  if (!nyEmails.length) return;
  await send({
    to: nyEmails,
    subject: `Casting Shipment ${shipment.shipment_number} Rejected — Action Required`,
    html: `
      <p>Shipment <b>${shipment.shipment_number}</b> was rejected by ${factory.factory_name}.</p>
      <p><b>Factory Notes:</b> ${shipment.rejection_notes || '(none)'}</p>
      <p><a href="${BASE_URL}/casting-shipments/${shipment.shipment_id}">View Shipment</a></p>`,
    entityType: 'casting_shipment', entityId: shipment.shipment_id,
  });
}

async function notifyShipmentReceived(shipment, factory) {
  const nyEmails = await settingsService.getNyEmails();
  if (!nyEmails.length) return;
  await send({
    to: nyEmails,
    subject: `Casting Shipment ${shipment.shipment_number} Received at ${factory.factory_name}`,
    html: `
      <p>Shipment <b>${shipment.shipment_number}</b> has been marked as received by ${factory.factory_name}.</p>
      <p>Metal balances at ${factory.factory_name} have been updated.</p>
      <p><a href="${BASE_URL}/casting-shipments/${shipment.shipment_id}">View Shipment</a></p>`,
    entityType: 'casting_shipment', entityId: shipment.shipment_id,
  });
}

async function notifyInvoiceAccepted(invoice, factory) {
  const to = factory.contact_email;
  if (!to) return;
  await send({
    to,
    subject: `Invoice ${invoice.invoice_number} Accepted by NY Office`,
    html: `
      <p>Invoice <b>${invoice.invoice_number}</b> has been accepted by the NY office.</p>
      <table border="1" cellpadding="4" cellspacing="0">
        <tr><td><b>Invoice #</b></td><td>${invoice.invoice_number}</td></tr>
        <tr><td><b>Invoice Date</b></td><td>${invoice.invoice_date}</td></tr>
        <tr><td><b>Received Date</b></td><td>${invoice.received_date}</td></tr>
        <tr><td><b>Value</b></td><td>$${parseFloat(invoice.dollar_value).toFixed(2)}</td></tr>
      </table>
      <p><a href="${BASE_URL}/factory-invoices/${invoice.invoice_id}">View Invoice</a></p>`,
    entityType: 'factory_invoice', entityId: invoice.invoice_id,
  });
}

module.exports = {
  notifyShipmentSubmitted,
  notifyShipmentApproved,
  notifyShipmentRejected,
  notifyShipmentReceived,
  notifyInvoiceAccepted,
};
