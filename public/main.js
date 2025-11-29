// =========================
// أدوات عامة للسلة (Cart)
// =========================

// قراءة السلة من localStorage
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch (e) {
    console.error("Error parsing cart from localStorage", e);
    return [];
  }
}

// حفظ السلة في localStorage
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// تحديث عدّاد السلة في الهيدر
function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return; // لو الصفحة ما فيها سلة

  const cart = getCart();
  const totalItems = cart.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.style.display = "inline-flex";
  } else {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

// إضافة منتج للسلة
function addToCart(product) {
  const cart = getCart();
  const index = cart.findIndex((item) => item.id === product.id);

  if (index !== -1) {
    cart[index].quantity = (cart[index].quantity || 1) + 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  updateCartBadge();
}

// إزالة منتج من السلة حسب id
function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  updateCartBadge();
}

// تفريغ السلة
function clearCart() {
  saveCart([]);
  updateCartBadge();
}

// =========================
// عرض المنتجات في الصفحة الرئيسية
// =========================

let allProducts = []; // كل المنتجات القادمة من السيرفر
let filteredProducts = []; // بعد الفلاتر

// رسم كرت منتج واحد (HTML)
function createProductCard(product) {
  return `
    <div class="product-card">
      <div class="product-image-placeholder">
        <span class="product-image-text">${product.image ? "" : product.category || ""}</span>
      </div>
      <div class="product-content">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-meta">
          ${product.category || "منتج"} • ${
    product.subcategory || "عام"
  }
        </p>
        <p class="product-description">
          ${product.description || "منتج تجريبي مناسب للاستخدام اليومي."}
        </p>
        <div class="product-footer">
          <span class="product-price">${product.price.toLocaleString(
            "ar-SA"
          )} ر.س</span>
          <button class="btn-add-to-cart" data-id="${product.id}">
            إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  `;
}

// رسم مجموعة منتجات داخل الـ grid
function renderProducts(products) {
  const container = document.getElementById("productsGrid");
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML =
      '<p class="empty-message">لا يوجد منتجات مطابقة للبحث / الفلتر.</p>';
    return;
  }

  container.innerHTML = products.map(createProductCard).join("");
}

// تحميل المنتجات من السيرفر
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    filteredProducts = allProducts.slice();
    renderProducts(filteredProducts);
  } catch (err) {
    console.error("Error loading products", err);
    const container = document.getElementById("productsGrid");
    if (container) {
      container.innerHTML =
        '<p class="empty-message">حدث خطأ أثناء تحميل المنتجات.</p>';
    }
  }
}

// =========================
// الفلاتر (بحث + سعر + تصنيفات)
// =========================

function applyFilters() {
  if (!allProducts.length) return;

  const searchInput = document.getElementById("searchInput");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const minPrice = minPriceInput && minPriceInput.value
    ? parseFloat(minPriceInput.value)
    : null;
  const maxPrice = maxPriceInput && maxPriceInput.value
    ? parseFloat(maxPriceInput.value)
    : null;

  // التصنيف الحالي المختار
  const activeCategoryBtn = document.querySelector(
    ".category-item.active"
  );
  const categoryFilter = activeCategoryBtn
    ? activeCategoryBtn.getAttribute("data-category")
    : null;
  const subcategoryFilter = activeCategoryBtn
    ? activeCategoryBtn.getAttribute("data-subcategory")
    : null;

  filteredProducts = allProducts.filter((p) => {
    // فلتر البحث
    if (searchTerm) {
      const text =
        (p.name || "") +
        " " +
        (p.description || "") +
        " " +
        (p.category || "") +
        " " +
        (p.subcategory || "");
      if (!text.toLowerCase().includes(searchTerm)) return false;
    }

    // فلتر السعر
    if (minPrice !== null && p.price < minPrice) return false;
    if (maxPrice !== null && p.price > maxPrice) return false;

    // فلتر التصنيف
    if (categoryFilter && categoryFilter !== "all") {
      if ((p.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
    }

    // فلتر التصنيف الفرعي
    if (subcategoryFilter) {
      if (
        (p.subcategory || "").toLowerCase() !==
        subcategoryFilter.toLowerCase()
      ) {
        return false;
      }
    }

    return true;
  });

  renderProducts(filteredProducts);
}

// إعادة تعيين الفلاتر
function resetFilters() {
  const searchInput = document.getElementById("searchInput");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");

  if (searchInput) searchInput.value = "";
  if (minPriceInput) minPriceInput.value = "";
  if (maxPriceInput) maxPriceInput.value = "";

  // إزالة تفعيل التصنيف
  document
    .querySelectorAll(".category-item")
    .forEach((btn) => btn.classList.remove("active"));

  filteredProducts = allProducts.slice();
  renderProducts(filteredProducts);
}

// تفعيل حدث التصنيفات في القائمة الجانبية
function setupCategoryFilters() {
  const categoryButtons = document.querySelectorAll(".category-item");
  if (!categoryButtons.length) return;

  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // إزالة active من الكل
      categoryButtons.forEach((b) => b.classList.remove("active"));
      // تفعيل العنصر الحالي
      btn.classList.add("active");
      applyFilters();
    });
  });

  const showAllBtn = document.getElementById("showAllCategoriesBtn");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      categoryButtons.forEach((b) => b.classList.remove("active"));
      resetFilters();
    });
  }
}

// =========================
// صفحة السلة cart.html
// =========================

function renderCartPage() {
  const itemsContainer = document.getElementById("cartItems");
  const totalElem = document.getElementById("cartTotal");
  const clearBtn = document.getElementById("clearCartBtn");

  if (!itemsContainer || !totalElem) {
    return; // الصفحة الحالية ليست صفحة السلة
  }

  const cart = getCart();

  if (!cart.length) {
    itemsContainer.innerHTML =
      '<p class="empty-message">السلة فارغة حاليًا.</p>';
    totalElem.textContent = "0 ر.س";
  } else {
    let total = 0;
    itemsContainer.innerHTML = cart
      .map((item) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        total += itemTotal;
        return `
          <div class="cart-item">
            <div class="cart-item-info">
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-meta">
                السعر: ${item.price.toLocaleString(
                  "ar-SA"
                )} ر.س • الكمية: ${item.quantity || 1}
              </div>
            </div>
            <div class="cart-item-actions">
              <span class="cart-item-total">
                ${itemTotal.toLocaleString("ar-SA")} ر.س
              </span>
              <button class="cart-remove-btn" data-id="${item.id}">
                إزالة
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    totalElem.textContent = total.toLocaleString("ar-SA") + " ر.س";
  }

  // زر تفريغ السلة
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!confirm("هل تريد تفريغ السلة بالكامل؟")) return;
      clearCart();
      renderCartPage();
    };
  }

  // أزرار إزالة منتج
  itemsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".cart-remove-btn");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    removeFromCart(id);
    renderCartPage();
  });
}

// =========================
// الربط مع الصفحة (DOM Ready)
// =========================

document.addEventListener("DOMContentLoaded", () => {
  // تحديث عدّاد السلة في كل الصفحات
  updateCartBadge();

  // لو في Grid للمنتجات → نحن في الصفحة الرئيسية
  if (document.getElementById("productsGrid")) {
    loadProducts();

    // إعداد الفلاتر
    const searchInput = document.getElementById("searchInput");
    const minPriceInput = document.getElementById("minPrice");
    const maxPriceInput = document.getElementById("maxPrice");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        // نخليها تتفاعل مع الكتابة مباشرة
        applyFilters();
      });
    }

    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", () => {
        applyFilters();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        resetFilters();
      });
    }

    if (minPriceInput) {
      minPriceInput.addEventListener("change", applyFilters);
    }
    if (maxPriceInput) {
      maxPriceInput.addEventListener("change", applyFilters);
    }

    // إعداد التصنيفات الجانبية
    setupCategoryFilters();

    // حدث زر "إضافة للسلة" (باستخدام event delegation)
    const productsGrid = document.getElementById("productsGrid");
    productsGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-add-to-cart");
      if (!btn) return;

      const id = btn.getAttribute("data-id");
      const product = allProducts.find(
        (p) => String(p.id) === String(id)
      );
      if (!product) return;

      addToCart(product);

      // feedback بسيط للمستخدم
      btn.textContent = "أضيفت ✅";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "إضافة للسلة";
        btn.disabled = false;
      }, 800);
    });
  }

  // لو في عناصر صفحة السلة → فعّل عرضها
  if (document.getElementById("cartItems")) {
    renderCartPage();
  }
});