let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cart.length;
}

updateCartCount();

/* ---- تحميل المنتجات ---- */
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const res = await fetch("/api/products");
  const products = await res.json();

  grid.innerHTML = "";

  products.forEach((p) => {
    grid.innerHTML += `
      <div class="product-card">
        <div class="prod-img"></div>

        <h3>${p.name}</h3>
        <p class="price">${p.price} ر.س</p>

        <button onclick='addToCart(${p.id})'>إضافة للسلة</button>
      </div>
    `;
  });
}

/* ---- إضافة للسلة ---- */
async function addToCart(id) {
  const res = await fetch("/api/products");
  const products = await res.json();

  const p = products.find((x) => x.id === id);
  cart.push(p);

  saveCart();
}

/* ---- عرض السلة ---- */
function loadCart() {
  const box = document.getElementById("cartItems");
  if (!box) return;

  box.innerHTML = "";

  cart.forEach((item, i) => {
    box.innerHTML += `
      <div class="cart-item">
        <h3>${item.name}</h3>
        <p>${item.price} ر.س</p>
        <button onclick="removeItem(${i})">حذف</button>
      </div>
    `;
  });
}

function removeItem(i) {
  cart.splice(i, 1);
  saveCart();
  loadCart();
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadCart();
});