function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    return JSON.parse(raw);
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
  if (!container) return;

  container.innerHTML =
    '<p class="text-xs text-slate-400">جاري تحميل المنتجات...</p>';

  try {
    const res = await fetch("/api/products");
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML =
        '<p class="text-xs text-slate-400">لا توجد منتجات حتى الآن.</p>';
      return;
    }

    container.innerHTML = "";
    products.forEach((p) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3";

      div.innerHTML = `
        <div class="flex items-center gap-3">
          ${
            p.image
              ? `<img src="${p.image}" class="w-10 h-10 rounded-lg object-cover border border-slate-700" />`
              : `<div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] text-slate-500">بدون</div>`
          }
          <div>
            <div class="font-semibold text-sm">${p.name}</div>
            <div class="text-[11px] text-slate-400">
              ${p.category || "بدون فئة"} • ${Number(p.price || 0).toLocaleString(
        "ar-SA"
      )} ر.س
            </div>
          </div>
        </div>
        <button
          class="text-[11px] px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600"
          data-id="${p.id}"
        >
          حذف
        </button>
      `;

      container.appendChild(div);
    });

    container.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (!confirm("هل تريد حذف هذا المنتج؟")) return;

        await fetch(`/api/admin/products/${id}`, {
          method: "DELETE"
        });

        loadProducts();
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-xs text-rose-400">حدث خطأ أثناء تحميل المنتجات.</p>';
  }
}

function setupAddProductForm() {
  const form = document.getElementById("addProductForm");
  const msg = document.getElementById("formMsg");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "text-xs";

    const fd = new FormData(form);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        msg.textContent = data.message || "خطأ أثناء إضافة المنتج";
        msg.classList.remove("text-emerald-400");
        msg.classList.add("text-rose-400");
        return;
      }

      msg.textContent = "تمت إضافة المنتج بنجاح ✅";
      msg.classList.remove("text-rose-400");
      msg.classList.add("text-emerald-400");
      form.reset();
      loadProducts();
    } catch (err) {
      console.error(err);
      msg.textContent = "خطأ في الاتصال بالسيرفر";
      msg.classList.remove("text-emerald-400");
      msg.classList.add("text-rose-400");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAdmin();
  if (!user) return;

  const nameSpan = document.getElementById("adminName");
  const logoutBtn = document.getElementById("logoutBtn");

  if (nameSpan) {
    nameSpan.textContent = `مرحباً، ${user.name} (أدمن)`;
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("currentUser");
      window.location.href = "login.html";
    };
  }

  setupAddProductForm();
  loadProducts();
});