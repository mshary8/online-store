// ================== CART HELPERS ==================
const CART_KEY = "cart";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;

  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove("hidden");
  } else {
    badge.textContent = "0";
    badge.classList.add("hidden");
  }
}

function addToCart(product) {
  const cart = getCart();
  const idx = cart.findIndex((i) => i.id === product.id);

  if (idx !== -1) {
    cart[idx].qty = (cart[idx].qty || 1) + 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      qty: 1
    });
  }

  saveCart(cart);
  updateCartBadge();
}

// ================== USER / ADMIN LINK ==================
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setupAdminLink() {
  const link = document.getElementById("adminPanelLink");
  if (!link) return;

  const user = getCurrentUser();
  if (user && user.role === "admin") {
    link.classList.remove("hidden");
  } else {
    link.classList.add("hidden");
  }
}

// ================== STORE PAGE (index) ==================
let allProducts = [];
let filteredProducts = [];

function createProductCard(p) {
  return `
    <div class="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/70 shadow-lg shadow-slate-950/40 overflow-hidden flex flex-col">
      <div class="h-32 bg-slate-900 flex items-center justify-center">
        ${
          p.image
            ? `<img src="${p.image}" alt="${p.name}" class="max-h-28 object-contain">`
            : `<div class="text-xs text-slate-500">بدون صورة</div>`
        }
      </div>
      <div class="p-3 flex flex-col gap-2 flex-1">
        <div>
          <h3 class="text-sm font-semibold mb-0.5">${p.name}</h3>
          <p class="text-[11px] text-slate-400">
            ${p.category || "منتج عام"}
          </p>
        </div>
        <p class="text-[11px] text-slate-400 line-clamp-2 min-h-[30px]">
          ${p.description || "منتج من متجر Al-Mashari Electronics."}
        </p>
        <div class="mt-auto flex items-center justify-between gap-2">
          <span class="text-sm font-bold text-emerald-400">
            ${Number(p.price || 0).toLocaleString("ar-SA")} ر.س
          </span>
          <button
            class="btn-add-to-cart px-3 py-1.5 rounded-full bg-emerald-500 text-emerald-950 text-xs font-semibold hover:bg-emerald-400"
            data-id="${p.id}"
          >
            إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  const countSpan = document.getElementById("productsCount");
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML =
      '<p class="text-xs text-slate-400 col-span-full">لا توجد منتجات حتى الآن.</p>';
  } else {
    grid.innerHTML = list.map(createProductCard).join("");
  }

  if (countSpan) {
    countSpan.textContent = list.length;
  }
}

function applyFilters() {
  if (!allProducts.length) return;
  const searchInput = document.getElementById("searchInput");
  const activeCatBtn = document.querySelector(".category-chip.active");
  const cat = activeCatBtn ? activeCatBtn.getAttribute("data-category") : "all";

  const searchTerm = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  filteredProducts = allProducts.filter((p) => {
    if (cat && cat !== "all") {
      if ((p.category || "").toLowerCase() !== cat.toLowerCase()) return false;
    }

    if (searchTerm) {
      const text =
        (p.name || "") +
        " " +
        (p.description || "") +
        " " +
        (p.category || "");
      if (!text.toLowerCase().includes(searchTerm)) return false;
    }

    return true;
  });

  renderProducts(filteredProducts);
}

async function setupStorePage() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    filteredProducts = allProducts.slice();
    renderProducts(filteredProducts);
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<p class="text-xs text-rose-400 col-span-full">خطأ في تحميل المنتجات.</p>';
  }

  // Category buttons
  const catButtons = document.querySelectorAll(".category-chip");
  catButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      catButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  });

  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => applyFilters());
  }

  // Add to cart (event delegation)
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add-to-cart");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const product = allProducts.find((p) => Number(p.id) === id);
    if (!product) return;

    addToCart(product);

    btn.textContent = "أضيفت ✅";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "إضافة للسلة";
      btn.disabled = false;
    }, 800);
  });
}

// ================== CART PAGE ==================
function renderCartPage() {
  const itemsContainer = document.getElementById("cartItems");
  const totalSpan = document.getElementById("cartTotal");
  const clearBtn = document.getElementById("clearCartBtn");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!itemsContainer || !totalSpan) return;

  const cart = getCart();

  if (!cart.length) {
    itemsContainer.innerHTML = `
      <div class="text-center text-sm text-slate-400 py-8">
        السلة فارغة حاليًا 🛒<br/>
        <a href="index.html" class="text-sky-400 hover:text-sky-300 text-xs mt-2 inline-block">
          العودة للتسوق
        </a>
      </div>
    `;
    totalSpan.textContent = "0 ر.س";
  } else {
    let total = 0;
    itemsContainer.innerHTML = cart
      .map((item) => {
        const qty = item.qty || 1;
        const itemTotal = Number(item.price || 0) * qty;
        total += itemTotal;

        return `
          <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0">
            <div>
              <div class="text-sm font-semibold">${item.name}</div>
              <div class="text-[11px] text-slate-400">
                ${item.category || ""} •
                سعر الواحد: ${Number(item.price || 0).toLocaleString(
                  "ar-SA"
                )} ر.س
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                الكمية: ${qty}
              </span>
              <span class="text-emerald-400 font-semibold">
                ${itemTotal.toLocaleString("ar-SA")} ر.س
              </span>
              <button
                class="px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-[11px]"
                data-remove-id="${item.id}"
              >
                حذف
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    totalSpan.textContent = total.toLocaleString("ar-SA") + " ر.س";
  }

  // Remove one item
  itemsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove-id]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-remove-id"));

    let cart = getCart();
    cart = cart.filter((i) => Number(i.id) !== id);
    saveCart(cart);
    updateCartBadge();
    renderCartPage();
  });

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!confirm("هل تريد مسح السلة بالكامل؟")) return;
      saveCart([]);
      updateCartBadge();
      renderCartPage();
    };
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      alert("هذه عملية تجريبية فقط ✅ يمكنك لاحقًا إضافة بوابة دفع أو صفحة تأكيد.");
    };
  }
}

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  setupAdminLink();
  setupStorePage();
  renderCartPage();
});