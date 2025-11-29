// public/main.js

// =========================
//  إعداد السلة (LocalStorage)
// =========================

function getCart() {
  const raw = localStorage.getItem("cart");
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      qty: 1,
    });
  }
  saveCart(cart);
  updateCartBadge();
}

// =========================
//  تحميل المنتجات من السيرفر
// =========================

let allProducts = [];
let filteredProducts = [];
let currentCategory = "all";

async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("خطأ في تحميل المنتجات");
    const data = await res.json();
    allProducts = data;
    filteredProducts = [...allProducts];

    renderProducts();
    updateProductsCount();
    updateCartBadge();
  } catch (err) {
    console.error(err);
    const grid = document.getElementById("productsGrid");
    if (grid) {
      grid.innerHTML =
        '<p class="error-text">تعذّر تحميل المنتجات من السيرفر.</p>';
    }
  }
}

// =========================
//  عرض المنتجات في الصفحة
// =========================

function formatPrice(p) {
  return p.toLocaleString("ar-SA", { minimumFractionDigits: 2 });
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (filteredProducts.length === 0) {
    grid.innerHTML =
      '<p class="empty-text">لا يوجد منتجات مطابقة للبحث أو الفلتر.</p>';
    return;
  }

  filteredProducts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-thumb">
        <span class="product-thumb-title">${p.name}</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${p.name}</h3>
        <p class="product-meta">${p.category || "بدون فئة"}</p>
        <p class="product-desc">
          ${
            p.description ||
            "منتج عالي الجودة مناسب للاستخدام اليومي والاحترافي."
          }
        </p>
        <div class="product-footer">
          <span class="product-price">ر.س ${formatPrice(p.price)}</span>
          <button class="btn-add-cart" data-id="${p.id}">
            إضافة للسلة
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // ربط أزرار "إضافة للسلة"
  document.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const product = allProducts.find((p) => p.id === id);
      if (product) {
        addToCart(product);
        btn.textContent = "أُضيفت ✅";
        setTimeout(() => {
          btn.textContent = "إضافة للسلة";
        }, 1000);
      }
    });
  });
}

function updateProductsCount() {
  const el = document.getElementById("productsCount");
  if (el) el.textContent = filteredProducts.length;
}

// =========================
//  الفلاتر والبحث
// =========================

function applyFilters() {
  let list = [...allProducts];

  // فلتر التصنيف
  if (currentCategory !== "all") {
    list = list.filter((p) => p.categoryKey === currentCategory);
  }

  // البحث بالاسم أو الوصف
  const searchInput = document.getElementById("searchInput");
  if (searchInput && searchInput.value.trim() !== "") {
    const q = searchInput.value.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // فلتر السعر
  const minEl = document.getElementById("priceMin");
  const maxEl = document.getElementById("priceMax");
  const min = minEl && minEl.value ? Number(minEl.value) : null;
  const max = maxEl && maxEl.value ? Number(maxEl.value) : null;

  if (min !== null) {
    list = list.filter((p) => p.price >= min);
  }
  if (max !== null) {
    list = list.filter((p) => p.price <= max);
  }

  filteredProducts = list;
  renderProducts();
  updateProductsCount();
}

function resetFilters() {
  const searchInput = document.getElementById("searchInput");
  const minEl = document.getElementById("priceMin");
  const maxEl = document.getElementById("priceMax");

  if (searchInput) searchInput.value = "";
  if (minEl) minEl.value = "";
  if (maxEl) maxEl.value = "";

  currentCategory = "all";
  highlightCategoryButton();

  filteredProducts = [...allProducts];
  renderProducts();
  updateProductsCount();
}

// =========================
//  تصنيف الأقسام (الجانب الأيمن)
// =========================

function highlightCategoryButton() {
  document.querySelectorAll(".category-item").forEach((btn) => {
    btn.classList.remove("active");
    const key = btn.getAttribute("data-category");
    if (key === currentCategory) {
      btn.classList.add("active");
    }
  });
}

function setupCategoryFilters() {
  document.querySelectorAll(".category-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = btn.getAttribute("data-category") || "all";
      highlightCategoryButton();
      applyFilters();
    });
  });
}

// =========================
//  تهيئة الصفحة
// =========================

function setupUIEvents() {
  const searchInput = document.getElementById("searchInput");
  const filterBtn = document.getElementById("applyFiltersBtn");
  const resetBtn = document.getElementById("resetFiltersBtn");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      // نخلي البحث مباشر
      applyFilters();
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      applyFilters();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetFilters();
    });
  }

  setupCategoryFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  // نتأكد إننا في صفحة المتجر (فيها productsGrid)
  if (document.getElementById("productsGrid")) {
    loadProducts();
    setupUIEvents();
  } else {
    // لو صفحة ثانية مثل login / register / cart
    updateCartBadge();
  }
});