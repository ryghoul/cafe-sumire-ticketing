/*
  barista.js
  Requires:
    - SheetJS (XLSX) library loaded before this script:
      <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    - Ensure this script is loaded with <script defer>
*/

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------------------
  // 0) CONSTANTS & ELEMENT REFERENCES
  // -----------------------------------------------------------------------------
  const socket       = io();
  const ordersEl     = document.getElementById('orders');
  const summaryBox   = document.getElementById('summaryBox');
  const saveBtn      = document.getElementById('saveSummary');
  const clearAllBtn  = document.getElementById('clearAll');

  const voidModal    = document.getElementById('voidModal');
  const voidListEl   = document.getElementById('voidList');
  const emptyVoidBtn = document.getElementById('emptyVoid');
  const voidClose    = document.getElementById('voidClose');
  const voidCancel   = document.getElementById('voidCancel');
  const voidConfirm  = document.getElementById('voidConfirm');

  const reasonModal   = document.getElementById('reasonModal');
  const reasonClose   = document.getElementById('reasonClose');
  const reasonCancel  = document.getElementById('reasonCancel');
  const reasonConfirm = document.getElementById('reasonConfirm');
  const reasonInput   = document.getElementById('reasonInput');

  let pendingVoid = null;
  let voided      = [];
  const ordersMap = {};

  // -----------------------------------------------------------------------------
  // 1) MODAL EVENT BINDINGS
  // -----------------------------------------------------------------------------
  [reasonClose, reasonCancel].forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('Reason modal closed');
      pendingVoid = null;
      reasonModal.classList.add('hidden');
    });
  });

  reasonConfirm.addEventListener('click', () => {
    console.log('Reason confirm clicked');
    if (!pendingVoid) return;
    const note = reasonInput.value.trim();
    voidOrder(pendingVoid, true, note);
    pendingVoid = null;
    reasonModal.classList.add('hidden');
  });

  [voidClose, voidCancel].forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('Void modal closed');
      voidModal.classList.add('hidden');
    });
  });

  voidConfirm.addEventListener('click', async () => {
    console.log('Void confirm clicked');
    const ids = voided.map(v => v.id);
    await Promise.all(ids.map(id => fetch(`/api/orders/${id}`, { method: 'DELETE' })));
    voided.forEach(v => {
      const el = document.getElementById(`void-${v.id}`);
      if (el) el.remove();
    });
    voided = [];
    voidModal.classList.add('hidden');
    alert('Voided orders permanently deleted.');
  });

  emptyVoidBtn.addEventListener('click', () => {
    console.log('Empty trash clicked');
    if (!voided.length) return alert('Nothing in the void.');
    voidListEl.innerHTML = voided.map(v =>
      `<li id="void-${v.id}"><strong>${v.name}</strong>: ${v.item}` +
      (v.note ? `<br><em class="text-sm">Note: ${v.note}</em>` : '') +
      `</li>`
    ).join('');
    voidModal.classList.remove('hidden');
  });

  // -----------------------------------------------------------------------------
  // 2) INITIAL FETCH & SOCKET EVENTS
  // -----------------------------------------------------------------------------
  ['pending', 'in-progress', 'ready'].forEach(status => {
    fetch(`/api/orders?status=${status}`)
      .then(r => r.json())
      .then(arr => arr.forEach(renderOrder));
  });

  ['newOrder', 'statusUpdate', 'orderDeleted', 'clearAll'].forEach(evt => {
    socket.on(evt, renderOrder);
  });

  socket.on('clearAll', () => {
    console.log('Received clearAll from socket');
    ordersEl.innerHTML = '';
    summaryBox.classList.add('hidden');
  });

  // -----------------------------------------------------------------------------
  // 3) RENDER & STATUS UPDATE
  // -----------------------------------------------------------------------------
  function renderOrder(order) {
    console.log('Rendering order', order._id);
    ordersMap[order._id] = order;
    const existing = document.getElementById(order._id);
    const card     = buildOrderCard(order);

    if (existing) {
      const next = existing.nextSibling;
      existing.remove();
      if (order.status === 'ready') ordersEl.append(card);
      else if (next) ordersEl.insertBefore(card, next);
      else ordersEl.append(card);
    } else {
      if (order.status === 'ready') ordersEl.append(card);
      else ordersEl.prepend(card);
    }
  }

  function updateStatus(id, newStatus) {
    console.log(`Updating status of ${id} to ${newStatus}`);
    fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    .then(r => r.json())
    .then(renderOrder);
  }

  // -----------------------------------------------------------------------------
  // 4) BUILD ORDER CARD
  // -----------------------------------------------------------------------------
  function buildOrderCard(order) {
    console.log('Building card for', order._id);
    const card = document.createElement('div');
    card.id    = order._id;
    card.className = `order-card ${order.status}`;

    if (order.name) {
      const h3 = document.createElement('h3');
      h3.className   = 'customer-name';
      h3.textContent = order.name;
      card.append(h3);
    }

    const trashBtn = document.createElement('button');
    trashBtn.className   = 'trash';
    trashBtn.textContent = '🗑️';
    trashBtn.addEventListener('click', () => {
      console.log('Trash clicked for', order._id);
      pendingVoid = order;
      reasonInput.value = '';
      reasonModal.classList.remove('hidden');
    });
    card.append(trashBtn);

    const ul = document.createElement('ul');
    ul.className = 'order-items';
    order.items.forEach(item => {
      const li   = document.createElement('li');
      const milk = item.milk ? ` (${item.milk})` : '';
      li.textContent = `${item.qty}× ${item.name}${milk}`;
      ul.append(li);
    });
    card.append(ul);

    const totalDiv = document.createElement('div');
    totalDiv.className = 'order-total';
    totalDiv.textContent = `Total: $${order.total.toFixed(2)}`;
    card.append(totalDiv);

    const actions = document.createElement('div');
    actions.className = 'order-actions';
    if (order.status === 'pending') {
      const btn = document.createElement('button');
      btn.className   = 'start';
      btn.textContent = 'Start';
      btn.addEventListener('click', () => updateStatus(order._id, 'in-progress'));
      actions.append(btn);
    } else if (order.status === 'in-progress') {
      const btn = document.createElement('button');
      btn.className   = 'ready';
      btn.textContent = 'Mark Ready';
      btn.addEventListener('click', () => updateStatus(order._id, 'ready'));
      actions.append(btn);
    }
    card.append(actions);

    return card;
  }

  // -----------------------------------------------------------------------------
  // 5) SUMMARY & DOWNLOAD
  // -----------------------------------------------------------------------------
  saveBtn.addEventListener('click', async () => {
    console.log('Save summary clicked');
    const res    = await fetch('/api/orders');
    if (!res.ok) return alert('Failed to fetch orders');
    const orders = await res.json();

    const agg = {};
    let total = 0;
    orders.forEach(o => {
      total += o.total;
      o.items.forEach(i => {
        const key = i.name + (i.milk ? ` (${i.milk})` : '');
        agg[key] = (agg[key] || 0) + i.qty;
      });
    });

    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    summaryBox.innerHTML = `
      <h2>Saved Summary</h2>
      <p><strong>Date:</strong> ${dateStr}</p>
      <ul>
        ${Object.entries(agg)
          .map(([item, qty]) => `<li>${qty}× ${item}</li>`)
          .join('')}
      </ul>
      <div class="grand-total">Grand Total: $${total.toFixed(2)}</div>
      <button id="downloadSummary" class="mt-4 px-4 py-2 rounded hover:bg-gray-100">
        ⬇️ Download Excel
      </button>
    `;
    summaryBox.classList.remove('hidden');

    document.getElementById('downloadSummary').addEventListener('click', async () => {
      console.log('Download summary clicked');
      const r2 = await fetch('/api/orders');
      if (!r2.ok) return alert('Failed to fetch orders');
      const data = await r2.json();
      const agg2 = {};
      data.forEach(o => o.items.forEach(i => {
        const key = i.name + (i.milk ? ` (${i.milk})` : '');
        agg2[key] = (agg2[key] || 0) + i.qty;
      }));

      const rows = [['Item', 'Quantity'], ...Object.entries(agg2)];
      const ws   = XLSX.utils.aoa_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob  = new Blob([wbout], { type: 'application/octet-stream' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = `order_summary_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // -----------------------------------------------------------------------------
  // 6) VOID/TRASH CONTROLS: bulk clear
  // -----------------------------------------------------------------------------
  clearAllBtn.addEventListener('click', () => {
    console.log('Clear all clicked');
    if (!confirm('Are you sure you want to void ALL orders?')) return;
    Array.from(document.querySelectorAll('.order-card')).forEach(el => {
      const order = ordersMap[el.id];
      if (order) voidOrder(order, true);
    });
    summaryBox.classList.add('hidden');
  });

  // -----------------------------------------------------------------------------
  // 7) VOID/TRASH HELPER
  // -----------------------------------------------------------------------------
  function voidOrder(order, skipConfirm = false, note = '') {
    if (!order) return;
    if (!skipConfirm && !confirm(`Void order for ${order.name}?`)) return;

    console.log('Voiding order', order._id, 'with note', note);
    const cardEl = document.getElementById(order._id);
    if (cardEl) cardEl.remove();

    const itemText = order.items
      .map(i => `${i.qty}× ${i.name}${i.milk ? ` (${i.milk})` : ''}`)
      .join(', ');
    voided.push({ id: order._id, name: order.name, item: itemText, note });

    const li = document.createElement('li');
    li.id = `void-${order._id}`;
    li.innerHTML = `
      <strong>${order.name}</strong>: ${itemText}
      ${note ? `<br><em class=\"text-sm\">Note: ${note}</em>` : ''}
    `;
    voidListEl.append(li);

    delete ordersMap[order._id];
  }
});
