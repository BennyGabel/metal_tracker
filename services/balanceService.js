const { sequelize, MetalBalance, BalanceTransaction, BalanceAdjustment } = require('../models');

// Add grams to a factory/purity balance (called when casting shipment is RECEIVED).
async function addBalance({ factoryId, purity, grams, txnType, referenceId, referenceType, notes, userId, transaction: externalTxn }) {
  return _updateBalance({
    factoryId, purity, grams: Math.abs(parseFloat(grams)),
    txnType, referenceId, referenceType, notes, userId, externalTxn,
  });
}

// Deduct grams from a factory/purity balance (called when factory invoice is ACCEPTED).
async function deductBalance({ factoryId, purity, grams, txnType, referenceId, referenceType, notes, userId, transaction: externalTxn }) {
  return _updateBalance({
    factoryId, purity, grams: -Math.abs(parseFloat(grams)),
    txnType, referenceId, referenceType, notes, userId, externalTxn,
  });
}

// Admin manual adjustment — positive or negative.
async function adjustBalance({ factoryId, purity, grams, reason, userId }) {
  return sequelize.transaction(async (t) => {
    const adj = await BalanceAdjustment.create({
      factory_id: factoryId, metal_purity: purity,
      adjustment_grams: grams, reason, adjusted_by: userId, adjusted_at: new Date(),
    }, { transaction: t });

    await _updateBalance({
      factoryId, purity, grams: parseFloat(grams),
      txnType: 'MANUAL_ADJUSTMENT',
      referenceId: adj.adjustment_id, referenceType: 'adjustment',
      notes: reason, userId, externalTxn: t,
    });
  });
}

// Set opening balance (also uses MANUAL_ADJUSTMENT transaction type but labeled OPENING_BALANCE).
async function setOpeningBalance({ factoryId, purity, grams, userId }) {
  return sequelize.transaction(async (t) => {
    // Fetch current balance
    let balance = await MetalBalance.findOne({
      where: { factory_id: factoryId, metal_purity: purity },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const current = balance ? parseFloat(balance.balance_grams) : 0;
    const delta = parseFloat(grams) - current;
    const newBalance = parseFloat(grams);

    if (balance) {
      await balance.update({ balance_grams: newBalance, last_updated_at: new Date() }, { transaction: t });
    } else {
      await MetalBalance.create({
        factory_id: factoryId, metal_purity: purity,
        balance_grams: newBalance, last_updated_at: new Date(),
      }, { transaction: t });
    }

    await BalanceTransaction.create({
      factory_id: factoryId, metal_purity: purity,
      txn_type: 'OPENING_BALANCE',
      grams_change: delta, balance_after: newBalance,
      reference_type: 'opening_balance',
      notes: `Opening balance set to ${grams}g`,
      performed_by: userId, performed_at: new Date(),
    }, { transaction: t });
  });
}

async function _updateBalance({ factoryId, purity, grams, txnType, referenceId, referenceType, notes, userId, externalTxn }) {
  const run = async (t) => {
    // Lock the balance row (or create if missing)
    let balance = await MetalBalance.findOne({
      where: { factory_id: factoryId, metal_purity: purity },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const current = balance ? parseFloat(balance.balance_grams) : 0;
    const newBalance = parseFloat((current + grams).toFixed(3));

    if (balance) {
      await balance.update({ balance_grams: newBalance, last_updated_at: new Date() }, { transaction: t });
    } else {
      await MetalBalance.create({
        factory_id: factoryId, metal_purity: purity,
        balance_grams: newBalance, last_updated_at: new Date(),
      }, { transaction: t });
    }

    await BalanceTransaction.create({
      factory_id: factoryId, metal_purity: purity,
      txn_type: txnType, grams_change: grams, balance_after: newBalance,
      reference_id: referenceId || null, reference_type: referenceType || null,
      notes: notes || null, performed_by: userId, performed_at: new Date(),
    }, { transaction: t });

    return newBalance;
  };

  if (externalTxn) {
    return run(externalTxn);
  }
  return sequelize.transaction(run);
}

module.exports = { addBalance, deductBalance, adjustBalance, setOpeningBalance };
