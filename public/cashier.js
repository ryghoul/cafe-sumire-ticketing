// cashier.js

// 1) DOM refs & state
const nameInput     = document.getElementById('customerName');
const totalInput    = document.getElementById('total');
const orderList     = document.getElementById('orderList');
const sendBtn       = document.getElementById('sendOrder');       // your “Send” button
const milkModal     = document.getElementById('milkModal');
const btnOat        = document.getElementById('chooseOat');
const btnTwo        = document.getElementById('chooseTwo');
const qtyInput      = document.getElementById('qtyInput');
const btnPlus       = document.getElementById('qtyPlus');
const btnMinus      = document.getElementById('qtyMinus');
const btnConfirm    = document.getElementById('confirmItem');
const closeBtn      = document.getElementById('closeModal');

const paymentModal  = document.getElementById('paymentModal');
const paymentClose  = document.getElementById('paymentClose');
const payCashBtn    = document.getElementById('payCash');
const payVenmoBtn   = document.getElementById('payVenmo');
const payZelleBtn   = document.getElementById('payZelle');

let pendingItem   = null;
let selectedMilk  = null;
const order       = [];   // current in‐cart items

// 2) RENDER MENU ITEMS INTO EACH SECTION
const menuItems = [
  { name: 'Matcha Latte',      price: 7.00, category: 'matcha' },
  { name: 'Red Bean Matcha',   price: 7.50, category: 'matcha' },
  { name: 'Lavender Matcha',   price: 7.50, category: 'matcha' },
  { name: 'Banana Matcha',     price: 7.50, category: 'matcha' },
  { name: 'Strawberry Matcha', price: 7.50, category: 'matcha' },
  { name: 'Blueberry Matcha',  price: 7.50, category: 'matcha' },
  { name: 'Hojicha Latte',        price: 7.00, category: 'hojicha' },
  { name: 'Banana Hojicha Latte', price: 7.50, category: 'hojicha' },
  { name: 'Sweet Corn Milk Tea',      price: 5.50, category: 'signature' },
  { name: 'Lychee Lavender Lemonade', price: 6.00, category: 'signature' }
];

const sections = {
  matcha:    'menu-matcha',
  hojicha:   'menu-hojicha',
  signature: 'menu-signature'
};

Object.entries(sections).forEach(([category, sectionId]) => {
  const container = document.getElementById(sectionId);
  menuItems
    .filter(item => item.category === category)
    .forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-item';
      card.innerHTML = `
        <div class="item-name">${item.name}</div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
      `;
      // when you click it, we open the milk/qty modal
      card.addEventListener('click', () => beginAddItem(item));
      container.appendChild(card);
    });
});


// 3) MILK MODAL LOGIC (unchanged) …
closeBtn.addEventListener('click', () => milkModal.classList.add('hidden'));
btnOat.addEventListener('click',  () => selectMilk('Oat Milk'));
btnTwo.addEventListener('click', () => selectMilk('2% Milk'));
btnPlus.addEventListener('click',  () => qtyInput.value = +qtyInput.value + 1);
btnMinus.addEventListener('click', () => {
  const v = +qtyInput.value - 1;
  if (v >= 1) qtyInput.value = v;
});
function selectMilk(type) {
  selectedMilk = type;
  btnOat.classList.toggle('chosen', type === 'Oat Milk');
  btnTwo.classList.toggle('chosen', type === '2% Milk');
}
function beginAddItem(item) {
  pendingItem = item;
  selectedMilk = null;
  btnOat.classList.remove('chosen');
  btnTwo.classList.remove('chosen');
  qtyInput.value = 1;
  milkModal.classList.remove('hidden');
}
btnConfirm.addEventListener('click', () => {
  const qty = Math.max(1, +qtyInput.value || 1);
  const skipMilk = ['Lychee Lavender Lemonade','Sweet Corn Milk Tea']
    .includes(pendingItem.name);
  if (!skipMilk && !selectedMilk) {
    return alert('Please select a milk option.');
  }
  order.push({
    name: pendingItem.name,
    price: pendingItem.price,
    qty,
    milk: skipMilk ? null : selectedMilk
  });
  renderOrder();
  milkModal.classList.add('hidden');
});

// 4) RENDER & TOTAL
function renderOrder() {
  orderList.innerHTML = '';
  let total = 0;
  order.forEach((it,i) => {
    total += it.price * it.qty;
    const li = document.createElement('li');
    const milkTxt = it.milk ? ` (${it.milk})` : '';
    li.innerHTML = `
      <span>${it.qty}× ${it.name}${milkTxt}</span>
      <span>$${(it.price * it.qty).toFixed(2)}</span>
      <button data-idx="${i}" class="remove-btn">✕</button>
    `;
    orderList.appendChild(li);
  });
  totalInput.value = total.toFixed(2);
}
orderList.addEventListener('click', e => {
  if (!e.target.matches('.remove-btn')) return;
  const idx = +e.target.dataset.idx;
  order.splice(idx,1);
  renderOrder();
});

// 5) PAYMENT MODAL FLOW

// 5.1 Open payment modal on Send
sendBtn.addEventListener('click', () => {
  if (order.length === 0) return alert('Add at least one item.');
  if (!nameInput.value.trim()) return alert('Enter a customer name.');
  paymentModal.classList.remove('hidden');
});

// 5.2 Close modal without sending
paymentClose.addEventListener('click', () => {
  paymentModal.classList.add('hidden');
});

// 5.3 Once a method is chosen, finalize the order
async function completeOrder(method) {
  paymentModal.classList.add('hidden');

  // build payload, including payment method
  const payload = {
    name:  nameInput.value.trim(),
    items: order.map(({name,qty,milk}) => ({ name, qty, milk })),
    total: parseFloat(totalInput.value),
    payment: method
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const { error } = await res.json().catch(()=>({}));
      throw new Error(error||'Order failed');
    }
    alert(`✅ Order sent (${method})!`);
    // reset form
    order.length = 0;
    renderOrder();
    nameInput.value = '';
    totalInput.value = '';
  } catch (err) {
    alert('❌ '+err.message);
  }
}

// 5.4 Hook up each payment button
payCashBtn.addEventListener('click', () => completeOrder('cash'));
payVenmoBtn.addEventListener('click', () => completeOrder('venmo'));
payZelleBtn.addEventListener('click', () => completeOrder('zelle'));
