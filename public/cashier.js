// cashier.js

// 1) DOM refs & state
const nameInput   = document.getElementById('customerName');
const totalInput  = document.getElementById('total');
const orderList   = document.getElementById('orderList');
const sendBtn     = document.getElementById('send');
const milkModal   = document.getElementById('milkModal');
const btnOat      = document.getElementById('chooseOat');
const btnTwo      = document.getElementById('chooseTwo');
const qtyInput    = document.getElementById('qtyInput');
const btnPlus     = document.getElementById('qtyPlus');
const btnMinus    = document.getElementById('qtyMinus');
const btnConfirm  = document.getElementById('confirmItem');
const closeBtn    = document.getElementById('closeModal');

let pendingItem   = null;
let selectedMilk  = null;
const order       = [];

// 2) Menu data & render to sections
const menuItems = [
  // Matcha
  { name: 'Matcha Latte',      price: 7.00, category: 'matcha' },
  { name: 'Red Bean Matcha',   price: 7.50, category: 'matcha' },
  { name: 'Lavender Matcha',   price: 7.50, category: 'matcha' },
  { name: 'Banana Matcha',     price: 7.50, category: 'matcha' },
  { name: 'Strawberry Matcha', price: 7.50, category: 'matcha' },
  { name: 'Blueberry Matcha',  price: 7.50, category: 'matcha' },
  // Hojicha
  { name: 'Hojicha Latte',        price: 7.00, category: 'hojicha' },
  { name: 'Banana Hojicha Latte', price: 7.50, category: 'hojicha' },
  // Signatures
  { name: 'Sweet Corn Milk Tea',      price: 5.50, category: 'signature' },
  { name: 'Lychee Lavender Lemonade', price: 6.00, category: 'signature' }
];
const sections = {
  matcha:    'menu-matcha',
  hojicha:   'menu-hojicha',
  signature: 'menu-signature'
};
Object.entries(sections).forEach(([cat, id]) => {
  const container = document.getElementById(id);
  menuItems
    .filter(item => item.category === cat)
    .forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-item';
      card.innerHTML = `
        <div class="item-name">${item.name}</div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
      `;
      card.addEventListener('click', () => beginAddItem(item));
      container.appendChild(card);
    });
});

// 3) Modal open/close & selection
closeBtn.addEventListener('click', () => milkModal.classList.add('hidden'));

function selectMilk(type) {
  selectedMilk = type;
  btnOat.classList.toggle('chosen', type === 'Oat Milk');
  btnTwo.classList.toggle('chosen', type === '2% Milk');
}
btnOat.addEventListener('click',  () => selectMilk('Oat Milk'));
btnTwo.addEventListener('click', () => selectMilk('2% Milk'));
btnPlus.addEventListener('click', () => qtyInput.value = parseInt(qtyInput.value) + 1);
btnMinus.addEventListener('click', () => {
  const v = parseInt(qtyInput.value) - 1;
  if (v >= 1) qtyInput.value = v;
});

function beginAddItem(item) {
  pendingItem = item;
  selectedMilk = null;
  btnOat.classList.remove('chosen');
  btnTwo.classList.remove('chosen');
  qtyInput.value = 1;
  milkModal.classList.remove('hidden');
}

btnConfirm.addEventListener('click', () => {
  const qty = Math.max(1, parseInt(qtyInput.value) || 1);
  const skipMilk = ['Lychee Lavender Lemonade','Sweet Corn Milk Tea']
    .includes(pendingItem.name);
  if (!skipMilk && !selectedMilk) {
    return alert('Please select a milk option.');
  }
  order.push({ name: pendingItem.name, price: pendingItem.price, qty, milk: skipMilk ? null : selectedMilk });
  renderOrder();
  milkModal.classList.add('hidden');
});

// 4) Render order list & total
function renderOrder() {
  orderList.innerHTML = '';
  let total = 0;
  order.forEach((it, i) => {
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
  if (e.target.matches('.remove-btn')) {
    const idx = parseInt(e.target.dataset.idx);
    order.splice(idx, 1);
    renderOrder();
  }
});

// 5) Send order to server
sendBtn.addEventListener('click', async () => {
  if (order.length === 0) return alert('Add at least one item.');
  const customerName = nameInput.value.trim();
  if (!customerName) return alert('Please enter a customer name.');

  const payload = {
    name:  customerName,
    items: order.map(({ name, qty, milk }) => ({ name, qty, milk })),
    total: parseFloat(totalInput.value)
  };
  console.log('Sending order:', payload);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'Order failed');
    }
    alert('✅ Order sent successfully!');
    order.length = 0;
    renderOrder();
    nameInput.value = '';
    totalInput.value = '';
  } catch (err) {
    alert('❌ ' + err.message);
  }
});
