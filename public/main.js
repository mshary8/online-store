const API_BASE = "https://online-store-2blx.onrender.com";

// ---------------- CART BADGE ----------------
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = getCart().length;
}

// ---------------- LOAD PRODUCTS --------------
async function loadProducts() {
  const container = document.getElementById("productsContainer");
  if (!container) return;

  container.innerHTML = "<p style='color:white'>جاري التحميل...</p>";

  const res = await fetch(`${API_BASE}/api/products`);
  const products = await res.json();

  container.innerHTML = "";

  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-box">
        <h3>${p.name}</h3>
        <p>${p.price} ر.س</p>
        <button onclick='addToCart(${p.id})'>إضافة للسلة</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------------- ADD TO CART ----------------
function addToCart(id) {
  let cart = getCart();
  cart.push(id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  loadProducts();
});