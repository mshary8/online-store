//-----------------------------------------------------
// CONFIG
//-----------------------------------------------------
const API_BASE = "";

//-----------------------------------------------------
// GET /api/products
//-----------------------------------------------------
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    return await res.json();
  } catch (err) {
    console.error("Error loading products:", err);
    return [];
  }
}

//-----------------------------------------------------
// ADD TO CART
//-----------------------------------------------------
function loadCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product) {
  let cart = loadCart();

  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart(cart);
  alert("تمت إضافة المنتج إلى السلة");
}

function updateCartBadge() {
  const count = loadCart().reduce((sum, p) => sum + p.qty, 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = count;
}

//-----------------------------------------------------
// RENDER PRODUCT CARD
//-----------------------------------------------------
function createProductCard(product) {
  return `
    <div class="product-card">
      <div class="product-img"></div>

      <h3 class="product-name">${product.name}</h3>

      <p class="product-price">${product.price} ر.س</p>

      <button class="add-btn" onclick='addToCart(${JSON.stringify(product)})'>
        إضافة للسلة
      </button>
    </div>
  `;
}

//-----------------------------------------------------
// DISPLAY PRODUCTS
//-----------------------------------------------------
function displayProducts(products) {
  const grid = document.getElementById("productsGrid");
  const count = document.getElementById("countProducts");

  if (!products.length) {
    grid.innerHTML = `<p class="no-products">لا يوجد منتجات مطابقة للبحث</p>`;
    count.textContent = "0 منتج";
    return;
  }

  grid.innerHTML = products.map(createProductCard).join("");
  count.textContent = `${products.length} منتج`;
}

//-----------------------------------------------------
// FILTERS
//-----------------------------------------------------
function applyFilters(allProducts) {
  const search = document.getElementById("searchInput").value.trim();
  const minPrice = Number(document.getElementById("minPrice").value);
  const maxPrice = Number(document.getElementById("maxPrice").value);

  return allProducts.filter((p) => {
    const matchText =
      p.name.includes(search) ||
      (p.description && p.description.includes(search));

    const matchPrice =
      (!minPrice || p.price >= minPrice) &&
      (!maxPrice || p.price <= maxPrice);

    return matchText && matchPrice;
  });
}

//-----------------------------------------------------
// CATEGORY FILTER
//-----------------------------------------------------
function filterByCategory(allProducts, category) {
  return allProducts.filter((p) => p.category === category);
}

//-----------------------------------------------------
// MAIN LOAD
//-----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  let allProducts = await fetchProducts();

  displayProducts(allProducts);
  updateCartBadge();

  // Apply filters
  document
    .getElementById("applyFilterBtn")
    .addEventListener("click", () => {
      const result = applyFilters(allProducts);
      displayProducts(result);
    });

  // Reset filters
  document
    .getElementById("resetFilterBtn")
    .addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("minPrice").value = "";
      document.getElementById("maxPrice").value = "5000";

      displayProducts(allProducts);
    });

  // Category sidebar
  document.querySelectorAll(".side-list li").forEach((li) => {
    li.addEventListener("click", () => {
      const cat = li.getAttribute("data-cat");
      const filtered = filterByCategory(allProducts, cat);
      displayProducts(filtered);
    });
  });

  // Show all
  document.getElementById("showAllBtn").addEventListener("click", () => {
    displayProducts(allProducts);
  });
});