const { sequelize, ShipmentCounter } = require('../models');

async function generateShipmentNumber() {
  return sequelize.transaction(async (t) => {
    // Lock the single counter row
    const [counter] = await sequelize.query(
      'SELECT next_value FROM shipment_counter WHERE id = 1 FOR UPDATE',
      { transaction: t, type: sequelize.QueryTypes.SELECT }
    );

    const seq = counter.next_value;

    await sequelize.query(
      'UPDATE shipment_counter SET next_value = next_value + 1 WHERE id = 1',
      { transaction: t }
    );

    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seqStr = String(seq).padStart(6, '0');

    return `NY-${yy}${mm}${dd}-${seqStr}`;
  });
}

module.exports = { generateShipmentNumber };
