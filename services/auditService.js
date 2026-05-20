const { AuditLog } = require('../models');

async function log({ userId, actionType, entityType, entityId, oldValue, newValue, notes, ipAddress }) {
  try {
    await AuditLog.create({
      user_id:     userId || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id:   entityId || null,
      old_value:   oldValue || null,
      new_value:   newValue || null,
      notes:       notes || null,
      ip_address:  ipAddress || null,
      created_at:  new Date(),
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { log };
