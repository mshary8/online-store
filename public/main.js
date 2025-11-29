// ========= AUTH / ADMIN BUTTON =========
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

function setupAdminButton() {
  const user = getCurrentUser();
  const adminBtn = document.getElementById("adminBtn");
  if (!adminBtn) return;

  if (user && user.role === "admin") {
    adminBtn.classList.remove("hidden");
    adminBtn.onclick = () => {
      window.location.href = "admin.html";
    };
  } else {
    adminBtn.classList.add("hidden");
  }
}

// ========= CART (LOCALSTORAGE) =========
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  badge.textContent = total;
}

// ========= PRODUCTS =========
let allProducts = [];

function formatPrice(v) {
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2 });
}

function renderProducts(filter = "all") {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  let list = allProducts;
  if (filter !== "all") {
    list = list.filter((p) => (p.category || "") === filter);
  }

  if (!list.length) {
    grid.innerHTML = `<p class="empty-message">لا توجد منتجات حتى الآن. أضف من لوحة الإدارة.</p>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
    <div class="product-card">
      <img src="${p.image || ""}" alt="${p.name}">
      <div class="product-name">${p.name}</div>
      <div class="product-meta">${p.category || "بدون فئة"}</div>
      <div class="product-footer">
        <span class="product-price">${formatPrice(p.price)} ر.س</span>
        <button class="btn-add" data-id="${p.id}">إضافة للسلة</button>
      </div>
    </div>
  `
    )
    .join("");
}

async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    renderProducts("all");
  } catch (err) {
    console.error("Error loading products", err);
  }
}

// ========= CATEGORY FILTER =========
function setupCategories() {
  const buttons = document.querySelectorAll(".cat");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.getAttribute("data-category") || "all";
      renderProducts(cat);
    });
  });
}

// ========= ADD TO CART FROM PRODUCTS =========
function setupAddToCart() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;

    const cart = getCart();
    const index = cart.findIndex((c) => c.id === id);

    if (index >= 0) {
      cart[index].quantity = (cart[index].quantity || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }

    saveCart(cart);
    updateCartBadge();

    btn.textContent = "✔ تمت الإضافة";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "إضافة للسلة";
      btn.disabled = false;
    }, 700);
  });
}

// ========= CART BUTTON NAVIGATION =========
function setupCartNav() {
  const btn = document.getElementById("cartBtn");
  if (!btn) return;
  btn.onclick = () => {
    window.location.href = "cart.html";
  };
}

// ========= INIT =========
document.addEventListener("DOMContentLoaded", () => {
  setupAdminButton();
  updateCartBadge();
  setupCartNav();
  setupCategories();
  setupAddToCart();
  loadProducts();
});