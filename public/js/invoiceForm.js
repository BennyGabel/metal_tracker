// Dynamic accept receipt lines for factory invoice detail page
(function() {
  const PURITIES = ['10KT','14KT','18KT','925'];

  function buildPurityOptions() {
    return PURITIES.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  function getNextIndex() {
    return document.querySelectorAll('#acceptLinesBody .accept-line').length;
  }

  function addLine() {
    const idx = getNextIndex();
    const tr = document.createElement('tr');
    tr.className = 'accept-line';
    tr.innerHTML = `
      <td>
        <select name="lines[${idx}][metal_purity]" class="form-select form-select-sm" required>
          ${buildPurityOptions()}
        </select>
      </td>
      <td><input type="number" name="lines[${idx}][pieces]" class="form-control form-control-sm" min="0"></td>
      <td><input type="number" name="lines[${idx}][net_weight_g]" class="form-control form-control-sm" step="0.001" min="0.001" required></td>
      <td><input type="number" name="lines[${idx}][dollar_value]" class="form-control form-control-sm" step="0.01" min="0" value="0.00"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger remove-accept-line">✕</button></td>
    `;
    document.getElementById('acceptLinesBody').appendChild(tr);
    reindex();
  }

  function reindex() {
    document.querySelectorAll('#acceptLinesBody .accept-line').forEach((tr, i) => {
      tr.querySelectorAll('[name]').forEach(el => {
        el.name = el.name.replace(/lines\[\d+\]/, `lines[${i}]`);
      });
    });
  }

  document.getElementById('addAcceptLine')?.addEventListener('click', addLine);

  document.getElementById('acceptLinesBody')?.addEventListener('click', e => {
    if (e.target.classList.contains('remove-accept-line')) {
      const rows = document.querySelectorAll('#acceptLinesBody .accept-line');
      if (rows.length <= 1) { alert('At least one receipt line is required.'); return; }
      e.target.closest('tr').remove();
      reindex();
    }
  });
})();
