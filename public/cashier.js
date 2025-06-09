
    let pendingItem = null;
    
    // 1) Your menu data, now with categories
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

    // 2) State & refs
    const order     = [];
    const totalIn   = document.getElementById('total');
    const orderList = document.getElementById('orderList');
    const sendBtn   = document.getElementById('send');
    const milkModal = document.getElementById('milkModal');
    const btnOat    = document.getElementById('chooseOat');
    const btnTwo    = document.getElementById('chooseTwo');
    const qtyInput   = document.getElementById('qtyInput');
    const btnPlus    = document.getElementById('qtyPlus');
    const btnMinus   = document.getElementById('qtyMinus');
    const btnConfirm = document.getElementById('confirmItem');
    const closeBtn = document.getElementById('closeModal');

    let selectedMilk = null; // used to hold the item awaiting milk choice

    //CLOSE BUTTON
    closeBtn.onclick = () => {
  milkModal.classList.add('hidden');
};

    // 3) Render cards into each section
    Object.entries(sections).forEach(([cat, cid]) => {
      const container = document.getElementById(cid);
      menuItems.filter(i=>i.category===cat).forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item';
        card.innerHTML = `
          <div class="item-name">${item.name}</div>
          <div class="item-price">$${item.price.toFixed(2)}</div>
        `;
        card.onclick = () => beginAddItem(item);
        container.appendChild(card);
      });
    });

    // 4) Kick off add—either modal or direct
function beginAddItem(item) {
  pendingItem    = item;
  selectedMilk   = null;
  btnOat.classList.remove('chosen');
  btnTwo.classList.remove('chosen');
  qtyInput.value = 1;
  milkModal.classList.remove('hidden');
}


// new milk‐choice handlers: just record the choice, don’t close or prompt
btnOat.onclick =  () => { selectedMilk = 'Oat Milk';  btnOat.classList.add('chosen'); btnTwo.classList.remove('chosen'); };
btnTwo.onclick = () => { selectedMilk = '2% Milk';       btnTwo.classList.add('chosen'); btnOat.classList.remove('chosen'); };

// qty +/– buttons
btnPlus .onclick = () => { qtyInput.value = parseInt(qtyInput.value) + 1; };
btnMinus.onclick = () => {
  const v = parseInt(qtyInput.value) - 1;
   if (v >= 1) qtyInput.value = v;
 };

 // new “Add to Order” button: read milk+qty and push, then close
btnConfirm.onclick = () => {
  const qty = Math.max(1, parseInt(qtyInput.value) || 1);

  // these two drinks don’t need a milk choice
  const skipMilk = [
    'Lychee Lavender Lemonade',
    'Sweet Corn Milk Tea'
  ].includes(pendingItem.name);

  if (!skipMilk && !selectedMilk) {
    return alert('Please select Oat or 2% Milk.');
  }

  order.push({
    name:  pendingItem.name,
    price: pendingItem.price,
    qty,
    milk:  skipMilk ? null : selectedMilk
  });

  renderOrder();
  milkModal.classList.add('hidden');
};


    // 7) Render order list & total, now including milk
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
          <button onclick="removeItem(${i})">✕</button>
        `;
        orderList.appendChild(li);
      });
      totalIn.value = total.toFixed(2);
    }

    function removeItem(idx) {
      order.splice(idx,1);
      renderOrder();
    }

    // 8) Send order
    sendBtn.onclick = async () => {
      if (order.length===0) return alert('Add at least one item.');
      const res = await fetch('/api/orders',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          items: order.map(({name,qty,milk})=>({name,qty,milk})),
          total: parseFloat(totalIn.value)
        })
      });
      if (res.ok) {
        alert('✅ Order sent!');
        order.length = 0;
        renderOrder();
        totalIn.value = '';
      } else {
        const {error} = await res.json();
        alert('❌ '+(error||'Failed to send'));
      }
    };

    /*Quick debug */
sendBtn.onclick = async () => {
  if (order.length === 0) {
    return alert('Add at least one item.');
  }

  const payload = {
    items: order.map(({ name, qty, milk }) => ({ name, qty, milk })),
    total: parseFloat(totalIn.value)
  };
  console.log('→ Sending order payload:', payload);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const { error } = await res.json();
      return alert('❌ ' + (error || 'Failed to send'));
    }
    alert('✅ Order sent!');
    order.length = 0;
    renderOrder();
    totalIn.value = '';
  } catch (e) {
    alert('Network error: ' + e.message);
  }
};
