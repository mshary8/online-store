function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}

function requireAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function loadProducts() {
  const container = document.getElementById("adminProductsList");
  container.innerHTML = `<p class="text-xs text-slate-400">جاري التحميل...</p>`;

  try {
    const res = await fetch("/api/products");
    const products = await res.json();

    if (!products.length) {
      container.innerHTML = '<p class="text-xs text-slate-400">لا توجد منتجات.</p>';
      return;
    }

    container.innerHTML = "";
    products.forEach((p) => {
      const div = document.createElement("div");
      div.className = "flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3";

      div.innerHTML = `
        <div class="flex items-center gap-3">
          ${p.image ? `<img src="${p.image}" class="w-10 h-10 rounded-lg object-cover" />` : ""}
          <div>
            <div class="font-semibold text-sm">${p.name}</div>
            <div class="text-xs text-slate-400">${p.category || "بدون فئة"} • ${p.price} ر.س</div>
          </div>
        </div>
        <button class="text-xs px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600" data-id="${p.id}">
          حذف
        </button>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("هل تريد حذف هذا المنتج؟")) return;
        await fetch(`/api/admin/products/${btn.dataset.id}`, { method: "DELETE" });
        loadProducts();
      });
    });

  } catch (err) {
    container.innerHTML = '<p class="text-xs text-rose-400">خطأ أثناء تحميل المنتجات.</p>';
  }
}

function setupAddProductForm() {
  const form = document.getElementById("addProductForm");
  const msg = document.getElementById("formMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const fd = new FormData(form);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      body: fd
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      msg.textContent = data.message || "خطأ أثناء إضافة المنتج";
      msg.classList = "text-xs text-rose-400";
      return;
    }

    msg.textContent = "تمت إضافة المنتج بنجاح";
    msg.classList = "text-xs text-emerald-400";
    form.reset();
    loadProducts();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAdmin();
  if (!user) return;

  document.getElementById("adminName").textContent = `مرحباً، ${user.name}`;
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  };

  setupAddProductForm();
  loadProducts();
});