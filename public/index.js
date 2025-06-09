// TRANSISITON IN BETWEEN SIDES
document.querySelector('button.secondary').onclick = (e) => {
  e.preventDefault();
  document.body.style.opacity = '0';
  setTimeout(() => {
    location.href = 'barista.html';
    location.href = 'cashier.html';
  }, 300);
};
