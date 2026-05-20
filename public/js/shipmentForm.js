(function() {
  const metalType = document.getElementById('metalTypeHidden')?.value;
  const GOLD_PURITIES = ['10KT','14KT','18KT'];
  const SILVER_PURITIES = ['925'];
  const purities = metalType === 'SILVER' ? SILVER_PURITIES : GOLD_PURITIES;

  const PURITY_FACTORS = { '10KT': 0.4177, '14KT': 0.585, '18KT': 0.75, '925': 0.925 };

  function getMetalLock() {
    return parseFloat(document.getElementById('metalLockInput')?.value) || 0;
  }

  function calcPricePerGram(purity, metalLock) {
    const factor = PURITY_FACTORS[purity] || 0;
    return Math.round((metalLock / 31.1035 * factor) * 100) / 100;
  }

  function recalcLine(tr) {
    const metalLock = getMetalLock();
    const purity = tr.querySelector('.purity-select')?.value;
    const grams  = parseFloat(tr.querySelector('.line-grams')?.value) || 0;
    const ppg    = calcPricePerGram(purity, metalLock);
    const dv     = Math.round(grams * ppg * 100) / 100;
    const ppgEl  = tr.querySelector('.line-ppg');
    const dvEl   = tr.querySelector('.line-dollar');
    if (ppgEl) ppgEl.value = ppg.toFixed(2);
    if (dvEl)  dvEl.value  = dv.toFixed(2);
  }

  function recalcAllLines() {
    document.querySelectorAll('#linesBody .line-row').forEach(recalcLine);
    updateTotals();
  }

  function buildPurityOptions(selected) {
    return purities.map(p =>
      `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`
    ).join('');
  }

  function getLineIndex() {
    return document.querySelectorAll('#linesBody .line-row').length;
  }

  function addLine() {
    const idx          = getLineIndex();
    const metalLock    = getMetalLock();
    const defaultPurity = purities[0];
    const ppg          = calcPricePerGram(defaultPurity, metalLock);
    const tr = document.createElement('tr');
    tr.className = 'line-row';
    tr.innerHTML = `
      <td>
        <select name="lines[${idx}][metal_purity]" class="form-select form-select-sm purity-select" required>
          ${buildPurityOptions(defaultPurity)}
        </select>
      </td>
      <td><input type="number" name="lines[${idx}][pieces]" class="form-control form-control-sm" min="1" required></td>
      <td><input type="number" name="lines[${idx}][net_weight_g]" class="form-control form-control-sm line-grams" step="0.001" min="0.001" required></td>
      <td><input type="number" name="lines[${idx}][price_per_gram]" class="form-control form-control-sm line-ppg" step="0.01" value="${ppg.toFixed(2)}" readonly></td>
      <td><input type="number" name="lines[${idx}][dollar_value]" class="form-control form-control-sm line-dollar" step="0.01" min="0" value="0.00" readonly></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger remove-line">✕</button></td>
    `;
    document.getElementById('linesBody').appendChild(tr);
    reindexLines();
    updateTotals();
  }

  function reindexLines() {
    document.querySelectorAll('#linesBody .line-row').forEach((tr, i) => {
      tr.querySelectorAll('[name]').forEach(el => {
        el.name = el.name.replace(/lines\[\d+\]/, `lines[${i}]`);
      });
    });
  }

  function updateTotals() {
    let totalPieces = 0, totalGrams = 0, totalDollars = 0;
    document.querySelectorAll('#linesBody .line-row').forEach(tr => {
      totalPieces  += parseInt(tr.querySelector('[name*="pieces"]')?.value)  || 0;
      totalGrams   += parseFloat(tr.querySelector('.line-grams')?.value)     || 0;
      totalDollars += parseFloat(tr.querySelector('.line-dollar')?.value)    || 0;
    });
    const tp = document.getElementById('totalPieces');
    const tg = document.getElementById('totalGrams');
    const tv = document.getElementById('totalValue');
    if (tp) tp.textContent = totalPieces;
    if (tg) tg.textContent = totalGrams.toFixed(3);
    if (tv) tv.value = totalDollars.toFixed(2);
  }

  // Events
  document.getElementById('addLine')?.addEventListener('click', addLine);

  document.getElementById('metalLockInput')?.addEventListener('input', recalcAllLines);

  document.getElementById('linesBody')?.addEventListener('click', e => {
    if (e.target.classList.contains('remove-line')) {
      const rows = document.querySelectorAll('#linesBody .line-row');
      if (rows.length <= 1) { alert('At least one line is required.'); return; }
      e.target.closest('tr').remove();
      reindexLines();
      updateTotals();
    }
  });

  document.getElementById('linesBody')?.addEventListener('change', e => {
    if (e.target.classList.contains('purity-select')) {
      recalcLine(e.target.closest('tr'));
      updateTotals();
    }
  });

  document.getElementById('linesBody')?.addEventListener('input', e => {
    if (e.target.classList.contains('line-grams')) {
      recalcLine(e.target.closest('tr'));
      updateTotals();
    } else {
      updateTotals();
    }
  });

  // Initial calculation on page load
  recalcAllLines();
})();
