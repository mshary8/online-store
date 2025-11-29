// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const session = require("express-session");

const app = express();

// Render يحب تستخدم المتغير PORT
const PORT = process.env.PORT || 10000;
const dbFile = path.join(__dirname, "db.json");

// ===== Helpers لقراءة/كتابة db.json =====
async function readDB() {
  try {
    const txt = await fs.readFile(dbFile, "utf8");
    const data = JSON.parse(txt || "{}");
    if (!data.products) data.products = [];
    if (!data.users) data.users = [];
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      const initial = { products: [], users: [] };
      await writeDB(initial);
      return initial;
    }
    throw err;
  }
}

async function writeDB(data) {
  await fs.writeFile(dbFile, JSON.stringify(data, null, 2), "utf8");
}

// ===== توليد منتجات تجريبية =====
function generateInitialProducts() {
  const categories = [
    { key: "laptops", name: "لابتوبات 💻" },
    { key: "phones", name: "الجوالات 📱" },
    { key: "headphones", name: "السماعات 🎧" },
    { key: "tablets", name: "التابلت 🧾" },
    { key: "monitors", name: "الشاشات 🖥️" },
    { key: "consoles", name: "أجهزة الترفيه (Sony / Xbox) 🎮" },
    { key: "gaming-screens", name: "شاشات الألعاب 🕹️" },
    { key: "gaming-accessories", name: "إكسسوارات الألعاب 🎯" },
    { key: "streaming", name: "اشتراكات منصات المشاهدة 📺" },
    { key: "other-subs", name: "اشتراكات وخدمات أخرى 🌐" },
  ];

  const products = [];
  let id = 1;

  for (const cat of categories) {
    for (let i = 1; i <= 10; i++) {
      const basePrice = 200 + i * 50;
      products.push({
        id: id++,
        name:
          cat.key === "laptops"
            ? `Laptop Pro ${i}`
            : cat.key === "phones"
            ? `Smart Phone ${i}`
            : cat.key === "headphones"
            ? `Wireless Headset ${i}`
            : cat.key === "tablets"
            ? `Tablet ${i}`
            : cat.key === "monitors"
            ? `4K Monitor ${i}`
            : cat.key === "consoles"
            ? i % 2 === 0
              ? `PlayStation 5 Bundle ${i}`
              : `Xbox Series X Bundle ${i}`
            : cat.key === "gaming-screens"
            ? `Gaming Screen ${i}`
            : cat.key === "gaming-accessories"
            ? `Gaming Mouse ${i}`
            : cat.key === "streaming"
            ? `اشتراك منصة مشاهدة ${i}`
            : `اشتراك خدمة رقم ${i}`,
        category: cat.key,
        categoryLabel: cat.name,
        price:
          cat.key === "streaming" || cat.key === "other-subs"
            ? 20 + i * 5
            : basePrice + i * 30,
        image:
          cat.key === "laptops"
            ? "laptop.jpg"
            : cat.key === "phones"
            ? "phone.jpg"
            : cat.key === "headphones"
            ? "headphones.jpg"
            : cat.key === "tablets"
            ? "tablet.jpg"
            : cat.key === "monitors"
            ? "monitor.jpg"
            : cat.key === "consoles"
            ? "console.jpg"
            : cat.key === "gaming-screens"
            ? "gaming-screen.jpg"
            : cat.key === "gaming-accessories"
            ? "gaming-accessory.jpg"
            : "subscription.jpg",
        description:
          "منتج تجريبي بجودة عالية، مناسب للاستخدام اليومي أو الترفيهي.",
      });
    }
  }

  return products;
}

// ===== تهيئة قاعدة البيانات أول مرة =====
async function seedDatabaseIfNeeded() {
  const db = await readDB();

  // تأكد من وجود admin
  if (!db.users || !Array.isArray(db.users)) db.users = [];
  const hasAdmin = db.users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    db.users.push({
      id: 1,
      name: "Admin",
      email: "admin@store.com",
      password: "123456", // للتجربة فقط
      role: "admin",
    });
    console.log("✔️ Admin user created: admin@store.com / 123456");
  }

  // تأكد من وجود منتجات
  if (!db.products || !Array.isArray(db.products) || db.products.length === 0) {
    db.products = generateInitialProducts();
    console.log("✔️ Seeded demo products (100 items)");
  }

  await writeDB(db);
}

// ===== إعدادات Express =====
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "meshari-tech-store-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ملفات الواجهة
app.use(express.static(path.join(__dirname, "public")));

// ===== دوال مساعدة للمستخدم الحالي =====
async function getCurrentUser(req) {
  if (!req.session.userId) return null;
  const db = await readDB();
  return db.users.find((u) => u.id === req.session.userId) || null;
}

// ===== API: المنتجات =====
app.get("/api/products", async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.products || []);
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ message: "خطأ في جلب المنتجات" });
  }
});

// ===== API: تسجيل جديد =====
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "البيانات غير مكتملة" });
    }

    const db = await readDB();
    const exists = db.users.find((u) => u.email === email);
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "هذا البريد مسجل مسبقًا" });
    }

    const newUser = {
      id: db.users.length ? db.users[db.users.length - 1].id + 1 : 2,
      name,
      email,
      password, // عادي plain للتجربة
      role: "user",
    };
    db.users.push(newUser);
    await writeDB(db);

    res.json({ success: true, message: "تم إنشاء الحساب بنجاح" });
  } catch (err) {
    console.error("POST /api/register error:", err);
    res.status(500).json({ success: false, message: "خطأ في السيرفر" });
  }
});

// ===== API: تسجيل الدخول =====
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "البيانات غير مكتملة" });
    }

    const db = await readDB();
    const user = db.users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    req.session.userId = user.id;

    res.json({
      success: true,
      name: user.name,
      isAdmin: user.role === "admin",
    });
  } catch (err) {
    console.error("POST /api/login error:", err);
    res.status(500).json({ success: false, message: "خطأ في السيرفر" });
  }
});

// ===== API: معلومات المستخدم الحالي =====
app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.json({ user: null });

    res.json({
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ user: null });
  }
});

// ===== API: تسجيل الخروج =====
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ===== API: إدارة المنتجات (للأدمن فقط) =====
app.get("/api/admin/products", async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }
    res.json(db.products || []);
  } catch (err) {
    console.error("GET /api/admin/products error:", err);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.post("/api/admin/products", async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const { name, price, category, image, description } = req.body || {};
    if (!name || !price) {
      return res
        .status(400)
        .json({ message: "اسم المنتج والسعر مطلوبان" });
    }

    const newId = db.products.length
      ? db.products[db.products.length - 1].id + 1
      : 1;

    const newProduct = {
      id: newId,
      name,
      price: Number(price),
      category: category || "other",
      categoryLabel: category || "منتجات أخرى",
      image: image || "product.jpg",
      description: description || "",
    };

    db.products.push(newProduct);
    await writeDB(db);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("POST /api/admin/products error:", err);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const id = Number(req.params.id);
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ message: "غير موجود" });

    db.products.splice(index, 1);
    await writeDB(db);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/products/:id error:", err);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

// ===== تشغيل السيرفر =====
app.listen(PORT, async () => {
  await seedDatabaseIfNeeded();
  console.log(`Server running on port ${PORT}`);
});