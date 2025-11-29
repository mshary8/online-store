// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

// ===== إعداد lowdb =====
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// هنا نمرر الـ default data عشان ما يطلع خطأ "missing default data"
const defaultData = { products: [], users: [] };
const db = new Low(adapter, defaultData);

// ===== إنشاء تطبيق Express =====
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: "meshari-tech-store-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// ===== توليد منتجات تجريبية =====
function generateSeedProducts() {
  const categories = [
    { key: "laptops", label: "إلكترونيات - لابتوبات", baseName: "Laptop Pro" },
    { key: "phones", label: "إلكترونيات - جوالات", baseName: "Smart Phone" },
    { key: "tablets", label: "إلكترونيات - تابلت", baseName: "Tab Plus" },
    { key: "monitors", label: "إلكترونيات - شاشات", baseName: "Ultra Monitor" },
    { key: "audio", label: "إلكترونيات - سماعات", baseName: "Sound Beats" },
    { key: "consoles", label: "أجهزة الترفيه - كونسل", baseName: "Game Station" },
    { key: "accessories", label: "إكسسوارات اللعب", baseName: "Gaming Accessory" },
    { key: "subscriptions", label: "اشتراكات المشاهدة", baseName: "Streaming Plan" },
    { key: "storage", label: "التخزين", baseName: "SSD Drive" },
    { key: "network", label: "الشبكات", baseName: "WiFi Router" },
  ];

  const products = [];
  let id = 1;

  categories.forEach((cat) => {
    for (let i = 1; i <= 10; i++) {
      const basePrice = 1500 + Math.floor(Math.random() * 2500);
      products.push({
        id: id++,
        name: `${cat.baseName} ${i}`,
        price: basePrice + i * 10,
        category: cat.key,
        section: cat.label,
        image: `${cat.key}${((i - 1) % 3) + 1}.jpg`,
        description: `منتج ${cat.baseName} رقم ${i} من فئة ${cat.label}، مناسب للاستخدام اليومي.`,
      });
    }
  });

  return products;
}

// ===== تهيئة قاعدة البيانات =====
async function initDB() {
  await db.read();

  // lowdb v7 يضمن وجود db.data لكن نتأكد من نوع الحقول
  if (!db.data) db.data = { ...defaultData };

  if (!Array.isArray(db.data.products)) db.data.products = [];
  if (!Array.isArray(db.data.users)) db.data.users = [];

  // لو ما فيه منتجات → نولّد ١٠٠ منتج
  if (db.data.products.length === 0) {
    db.data.products = generateSeedProducts();
    console.log("Seeded 100 products 🌟");
  }

  // تأكد فيه أدمن واحد على الأقل
  const hasAdmin = db.data.users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    db.data.users.push({
      id: 1,
      name: "Admin",
      email: "admin@store.com",
      password: "admin123", // للتجربة فقط
      role: "admin",
    });
    console.log("Created default admin user (admin@store.com / admin123)");
  }

  await db.write();
  console.log("Database initialized ✅");
}

// شغّل التهيئة
initDB().catch((err) => console.error("DB init error:", err));

// ===== دوال المساعدة للمستخدم الحالي =====
async function getCurrentUser(req) {
  await db.read();
  const userId = req.session.userId;
  if (!userId) return null;
  return db.data.users.find((u) => u.id === userId) || null;
}

async function requireAdmin(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولا" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ message: "مسموح للمشرف فقط" });
  }
  req.user = user;
  next();
}

// ===== Routes =====

// المنتجات (للمتجر)
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// تسجيل مستخدم جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.json({ success: false, message: "البيانات غير مكتملة" });
  }

  await db.read();
  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res.json({ success: false, message: "هذا البريد مستخدم مسبقًا" });
  }

  const nextId =
    db.data.users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;

  db.data.users.push({
    id: nextId,
    name,
    email,
    password, // بدون تشفير (تجربة)
    role: "user",
  });

  await db.write();

  res.json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
  });
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};

  await db.read();
  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
  }

  req.session.userId = user.id;

  res.json({
    success: true,
    name: user.name,
    isAdmin: user.role === "admin",
    token: "session",
  });
});

// معلومات المستخدم الحالي
app.get("/api/auth/me", async (req, res) => {
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
});

// تسجيل الخروج
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ===== API الأدمن =====

// قراءة المنتجات
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// إضافة منتج
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, price, category, image, description } = req.body || {};

  if (!name || !price) {
    return res
      .status(400)
      .json({ message: "الاسم والسعر حقول مطلوبة", success: false });
  }

  await db.read();

  const nextId =
    db.data.products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;

  const product = {
    id: nextId,
    name,
    price: Number(price),
    category: category || "other",
    image: image || "",
    description: description || "",
  };

  db.data.products.push(product);
  await db.write();

  res.status(201).json(product);
});

// حذف منتج
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.read();

  const index = db.data.products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "المنتج غير موجود" });
  }

  db.data.products.splice(index, 1);
  await db.write();

  res.json({ success: true });
});

// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});