const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

// ============ LOWDB SETUP ============
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");

// لازم نعطي lowdb بيانات افتراضية عشان ما يطلع
// الخطأ: lowdb: missing default data
const defaultData = {
  products: [],
  users: []
};

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, defaultData);

// ============ تهيئة قاعدة البيانات ============
async function initDB() {
  await db.read();

  // لو الملف كان فاضي {} أو undefined
  if (!db.data) {
    db.data = { products: [], users: [] };
  }

  if (!Array.isArray(db.data.products)) db.data.products = [];
  if (!Array.isArray(db.data.users)) db.data.users = [];

  // إنشاء أدمن افتراضي لو مو موجود
  if (!db.data.users.some((u) => u.role === "admin")) {
    db.data.users.push({
      id: Date.now(),
      name: "Admin",
      email: "admin@store.com",
      password: "admin123", // للتجربة فقط (مو آمن للإنتاج)
      role: "admin"
    });
    console.log("Created default admin: admin@store.com / admin123");
  }

  // توليد 100 منتج تجريبي لو ما فيه منتجات
  if (db.data.products.length === 0) {
    db.data.products = generateSeedProducts();
    console.log("Seeded 100 demo products");
  }

  await db.write();
  console.log("Database initialized ✅");
}

// ============ توليد منتجات تجريبية ============
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSeedProducts() {
  const products = [];
  let id = 1;

  const categories = [
    {
      key: "laptops",
      label: "لابتوبات 💻",
      minPrice: 2500,
      maxPrice: 7000,
      image: "laptop.jpg"
    },
    {
      key: "phones",
      label: "جوالات 📱",
      minPrice: 1500,
      maxPrice: 5000,
      image: "phone.jpg"
    },
    {
      key: "headphones",
      label: "سماعات 🎧",
      minPrice: 150,
      maxPrice: 1200,
      image: "headphones.jpg"
    },
    {
      key: "consoles",
      label: "أجهزة ترفيه (Sony / Xbox) 🎮",
      minPrice: 1500,
      maxPrice: 4000,
      image: "console.jpg"
    },
    {
      key: "monitors",
      label: "شاشات كمبيوتر 🖥️",
      minPrice: 700,
      maxPrice: 2500,
      image: "monitor.jpg"
    },
    {
      key: "storage",
      label: "وحدات تخزين (SSD / HDD) 💾",
      minPrice: 150,
      maxPrice: 900,
      image: "storage.jpg"
    },
    {
      key: "accessories",
      label: "إكسسوارات (كيبورد / ماوس) ⌨️",
      minPrice: 50,
      maxPrice: 500,
      image: "accessories.jpg"
    },
    {
      key: "smart-home",
      label: "أجهزة منزل ذكي 🏠",
      minPrice: 200,
      maxPrice: 1500,
      image: "smarthome.jpg"
    },
    {
      key: "streaming",
      label: "اشتراكات منصات مشاهدة 📺",
      minPrice: 20,
      maxPrice: 100,
      image: "streaming.jpg"
    },
    {
      key: "gaming-sub",
      label: "اشتراكات ألعاب 🎮☁️",
      minPrice: 30,
      maxPrice: 150,
      image: "gaming-sub.jpg"
    }
  ];

  categories.forEach((cat) => {
    for (let i = 1; i <= 10; i++) {
      const price = randomInt(cat.minPrice, cat.maxPrice);
      const product = {
        id: id++,
        name: `${cat.label} - منتج رقم ${i}`,
        category: cat.key, // نستخدمه في الفلتر في الواجهة الأمامية
        categoryLabel: cat.label,
        price,
        description: `منتج من فئة ${cat.label} مناسب للاستخدام اليومي.`,
        image: `/images/${cat.image}`
      };
      products.push(product);
    }
  });

  return products;
}

// ============ إعداد السيرفر ============
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false
  })
);

// ملفات الواجهة الأمامية
app.use(express.static(path.join(__dirname, "public")));

// ميدل وير لتحميل المستخدم من الـ session
app.use(async (req, res, next) => {
  await db.read();
  const userId = req.session.userId;
  if (userId) {
    const user = db.data.users.find((u) => u.id === userId);
    req.user = user || null;
  } else {
    req.user = null;
  }
  next();
});

// ميدل وير للتحقق من تسجيل الدخول
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "يجب تسجيل الدخول أولاً"
    });
  }
  next();
}

// ميدل وير للأدمن فقط
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "صلاحية الأدمن فقط"
    });
  }
  next();
}

// ============ مسارات الأوث ============
app.get("/api/auth/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "البيانات غير مكتملة" });
  }

  await db.read();

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "البريد الإلكتروني مستخدم من قبل" });
  }

  const user = {
    id: Date.now(),
    name,
    email,
    password, // للتجربة فقط
    role: "user"
  };

  db.data.users.push(user);
  await db.write();

  res.json({ success: true, message: "تم إنشاء الحساب بنجاح" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  await db.read();
  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "بيانات الدخول غير صحيحة" });
  }

  req.session.userId = user.id;

  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    name: user.name,
    isAdmin: user.role === "admin"
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ============ مسارات المنتجات (الواجهة الأمامية) ============
app.get("/api/products", async (req, res) => {
  await db.read();
  const products = db.data.products || [];
  res.json(products);
});

// ============ مسارات الأدمن للمنتجات ============
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, price, category, image, description } = req.body;

  if (!name || !price) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والسعر مطلوبان" });
  }

  await db.read();

  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price),
    category: category || "other",
    categoryLabel: "",
    image: image || "",
    description: description || ""
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.read();

  const before = db.data.products.length;
  db.data.products = db.data.products.filter((p) => p.id !== id);
  const after = db.data.products.length;

  if (before === after) {
    return res.status(404).json({ success: false, message: "المنتج غير موجود" });
  }

  await db.write();
  res.json({ success: true });
});

// ============ مسارات الأدمن للمستخدمين ============
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  await db.read();
  const users = db.data.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    password: u.password // للتجربة فقط – لا تُستخدم في مشروع حقيقي
  }));
  res.json(users);
});

// أي مسار غير معروف → رجّع index.html (للواجهة الأمامية)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============ تشغيل السيرفر ============
initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
});