
// ===== Helpers for cart in localStorage =====
const CART_KEY = "simpleStoreCart";

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const el = document.getElementById("cart-count");
  if (el) el.textContent = count;
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart(cart);
  alert("تم إضافة المنتج إلى السلة");
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter((item) => item.id !== id);
  saveCart(cart);
  renderCart();
}

function changeQuantity(id, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    const filtered = cart.filter((i) => i.id !== id);
    saveCart(filtered);
  } else {
    saveCart(cart);
  }
  renderCart();
}

// ===== Fetch products & render on index =====
async function loadProducts() {
  const listEl = document.getElementById("product-list");
  if (!listEl) return;

  try {
    const res = await fetch("/api/products");
    const products = await res.json();

    listEl.innerHTML = "";
    products.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";

      const img = document.createElement("img");
      img.src = p.image || "https://via.placeholder.com/400x300?text=No+Image";
      img.alt = p.name;

      const title = document.createElement("h3");
      title.textContent = p.name;

      const desc = document.createElement("p");
      desc.textContent = p.description;

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = p.price.toFixed(2) + " ر.س";

      const btn = document.createElement("button");
      btn.className = "btn-primary";
      btn.textContent = "إضافة إلى السلة";
      btn.addEventListener("click", () => addToCart({
        id: p.id,
        name: p.name,
        price: p.price
      }));

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(price);
      card.appendChild(btn);

      listEl.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading products", err);
    listEl.innerHTML = "<p>حدث خطأ في تحميل المنتجات.</p>";
  }
}

// ===== Render cart page =====
function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const summaryEl = document.getElementById("cart-summary");
  if (!itemsEl || !summaryEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    itemsEl.innerHTML = "<p>السلة فارغة.</p>";
    summaryEl.innerHTML = "";
    return;
  }

  itemsEl.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    const name = document.createElement("div");
    name.className = "cart-item-name";
    name.textContent = item.name;

    const qty = document.createElement("div");
    qty.className = "cart-item-qty";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "-";
    minusBtn.onclick = () => changeQuantity(item.id, -1);

    const qtySpan = document.createElement("span");
    qtySpan.textContent = item.quantity;

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.onclick = () => changeQuantity(item.id, 1);

    qty.appendChild(minusBtn);
    qty.appendChild(qtySpan);
    qty.appendChild(plusBtn);

    const price = document.createElement("div");
    price.className = "cart-item-price";
    price.textContent = lineTotal.toFixed(2) + " ر.س";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "حذف";
    removeBtn.onclick = () => removeFromCart(item.id);

    row.appendChild(name);
    row.appendChild(qty);
    row.appendChild(price);
    row.appendChild(removeBtn);

    itemsEl.appendChild(row);
  });

  summaryEl.textContent = "الإجمالي: " + total.toFixed(2) + " ر.س";
}

// ===== Admin form =====
function initAdminForm() {
  const form = document.getElementById("admin-form");
  const msg = document.getElementById("admin-message");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const product = {
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      price: parseFloat(document.getElementById("price").value),
      image: document.getElementById("image").value,
      category: document.getElementById("category").value,
      stock: parseInt(document.getElementById("stock").value || "0", 10)
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
      });

      if (!res.ok) {
        msg.textContent = "حدث خطأ أثناء الحفظ.";
        return;
      }

      const data = await res.json();
      msg.textContent = "تم حفظ المنتج بنجاح (ID: " + data.id + ")";
      form.reset();
    } catch (err) {
      console.error("Error saving product", err);
      msg.textContent = "حدث خطأ أثناء الحفظ.";
    }
  });
}

// ===== Init on page load =====
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  loadProducts();
  renderCart();
  initAdminForm();

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      alert("هذه عملية دفع تجريبية فقط (لا يوجد بوابة دفع حقيقية).");
    });
  }
});
