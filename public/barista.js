// 1) socket connection
const socket = io();

// 2) TOOLBAR BUTTONS
document.getElementById('clearAll').onclick = async () => {
  if (!confirm('Are you sure you want to delete ALL orders?')) return;
  const res = await fetch('/api/orders', { method: 'DELETE' });
  if (res.ok) {
    document.getElementById('orders').innerHTML = '';
  } else {
    const { error } = await res.json();
    alert('Error clearing orders: ' + error);
  }
};
socket.on('clearAll', () => {
  document.getElementById('orders').innerHTML = '';
  document.getElementById('summaryBox').classList.add('hidden');
});

document.getElementById('saveSummary').onclick = async () => {
  const res    = await fetch('/api/orders');
  if (!res.ok) return alert('Failed to fetch orders');
  const orders = await res.json();

  // aggregate
  const agg = {}, date = new Date();
  let total = 0;
  orders.forEach(o => {
    total += o.total;
    o.items.forEach(i => {
      const key = i.name + (i.milk ? ` (${i.milk})` : '');
      agg[key] = (agg[key] || 0) + i.qty;
    });
  });

  // format date
  const dateStr = date.toLocaleDateString('en-US', {
    year:'numeric', month:'long', day:'numeric'
  });

  // render summary
  const sb = document.getElementById('summaryBox');
  sb.innerHTML = `
    <h2>Saved Summary</h2>
    <p><strong>Date:</strong> ${dateStr}</p>
    <ul>
      ${Object.entries(agg)
        .map(([item, qty]) => `<li>${qty}× ${item}</li>`)
        .join('')}
    </ul>
    <div class="grand-total">Grand Total: $${total.toFixed(2)}</div>
  `;
  sb.classList.remove('hidden');
};
['newOrder','statusUpdate','orderDeleted','clearAll']
  .forEach(evt => socket.on(evt, () => {
    document.getElementById('summaryBox').classList.add('hidden');
  }));

// 3) RENDER FUNCTION
function renderOrder(order) {
  const container = document.getElementById('orders');
  const existing  = document.getElementById(order._id);

  // 1) Build the card element and all of its children:
  const card = document.createElement('div');
  card.id        = order._id;
  card.className = `order-card ${order.status}`;

  // — Trash button
  const btnTrash = document.createElement('button');
  btnTrash.className = 'trash';
  btnTrash.textContent = '🗑️';
  btnTrash.onclick = () => deleteOrder(order._id);
  card.appendChild(btnTrash);

// — Items list
  const ul = document.createElement('ul');
  ul.className = 'order-items';
  order.items.forEach(item => {
    const li = document.createElement('li');
    // include milk in parentheses if present
    const milkTxt = item.milk ? ` (${item.milk})` : '';
    li.textContent = `${item.qty}× ${item.name}${milkTxt}`;
    ul.appendChild(li);
  });
  card.appendChild(ul);


  // — Total
  const totalDiv = document.createElement('div');
  totalDiv.className = 'order-total';
  totalDiv.textContent = `Total: $${order.total.toFixed(2)}`;
  card.appendChild(totalDiv);

  // — Action buttons
  const actions = document.createElement('div');
  actions.className = 'order-actions';
  if (order.status === 'pending') {
    const btnStart = document.createElement('button');
    btnStart.className = 'start';
    btnStart.textContent = 'Start';
    btnStart.onclick = () => updateStatus(order._id, 'in-progress');
    actions.appendChild(btnStart);
  } else if (order.status === 'in-progress') {
    const btnReady = document.createElement('button');
    btnReady.className = 'ready';
    btnReady.textContent = 'Mark Ready';
    btnReady.onclick = () => updateStatus(order._id, 'ready');
    actions.appendChild(btnReady);
  }
  card.appendChild(actions);

  // 2) Insert/update logic:
   if (existing) {
    // It’s an update: remove old and re-insert
    const next = existing.nextSibling;
    container.removeChild(existing);

    if (order.status === 'ready') {
      // status change → ready: move to bottom
      container.appendChild(card);
    } else {
      // pending or in-progress: keep its spot
      if (next) {
        container.insertBefore(card, next);
      } else {
        container.appendChild(card);
      }
    }
  } else {
    // Brand new (or initial fetch)…
    if (order.status === 'ready') {
      // already ready? send to bottom
      container.appendChild(card);
    } else {
      // pending/in-progress: newest at top
      container.prepend(card);
    }
  }
}


// 4) INITIAL FETCH of existing orders
['pending','in-progress','ready'].forEach(status => {
  fetch(`/api/orders?status=${status}`)
    .then(r => r.json())
    .then(arr => arr.forEach(renderOrder));  // ← removed .reverse()
});

// 5) SOCKET LISTENERS for real-time
socket.on('newOrder', renderOrder);
socket.on('statusUpdate', renderOrder);

// 6) HELPERS
function updateStatus(id, newStatus) {
  fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ status: newStatus })
  })
  .then(r => r.json())
  .then(renderOrder);
}

// DELETE FUNCTION
function deleteOrder(id) {
  if (!confirm('Really delete this order?')) return;
  fetch(`/api/orders/${id}`, { method: 'DELETE' })
    .then(res => {
      if (res.ok) {
        const el = document.getElementById(id);
        if (el) el.remove();
      } else {
        res.json().then(j => alert('Error: ' + j.error));
      }
    })
    .catch(() => alert('Network error'));
}
