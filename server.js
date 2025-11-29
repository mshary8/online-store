// server.js - Meshari Tech Store Backend

const express = require("express");
const path = require("path");
const cors = require("cors");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

// ==== إعداد المسارات الأساسية ====
const app = express();
const PORT = process.env.PORT || 10000;
const __dirnameResolved = __dirname || path.resolve();

// ==== ميدل وير عام ====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirnameResolved, "public")));

// ==== إعداد lowdb ====
const dbFile = path.join(__dirnameResolved, "db.json");
const adapter = new JSONFile(dbFile);
const defaultData = { users: [], products: [], orders: [] };
const db = new Low(adapter, defaultData);

// دالة تهيئة قاعدة البيانات
async function initDB() {
  await db.read();

  if (!db.data) {
    db.data = { ...defaultData };
  }

  if (!Array.isArray(db.data.users)) db.data.users = [];
  if (!Array.isArray(db.data.products)) db.data.products = [];
  if (!Array.isArray(db.data.orders)) db.data.orders = [];

  // ===== إنشاء الأدمن =====
  const adminEmail = "meshari@gmail.com";
  const adminPassword = "1234561";

  let admin = db.data.users.find((u) => u.email === adminEmail);

  if (!admin) {
    const newId = db.data.users.length
      ? Math.max(...db.data.users.map((u) => u.id)) + 1
      : 1;

    admin = {
      id: newId,
      name: "Meshari",
      email: adminEmail,
      password: adminPassword, // للتجربة فقط (بدون تشفير)
      role: "admin",
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(admin);
    console.log("✅ Admin user created:", adminEmail, "/", adminPassword);
  }

  // ===== تهيئة 100 منتج (لو ما في منتجات) =====
  if (!db.data.products.length) {
    const products = [];
    let id = 1;

    function rand(min, max) {
      return Math.round(min + Math.random() * (max - min));
    }

    const groups = [
      {
        category: "laptops",
        displayCategory: "لابتوبات",
        baseName: "Laptop Pro",
        min: 2500,
        max: 6000,
      },
      {
        category: "phones",
        displayCategory: "جوالات",
        baseName: "Smart Phone",
        min: 1500,
        max: 4500,
      },
      {
        category: "tablets",
        displayCategory: "تابلت",
        baseName: "Tablet Plus",
        min: 900,
        max: 3000,
      },
      {
        category: "audio",
        displayCategory: "سماعات",
        baseName: "Wireless Headset",
        min: 200,
        max: 900,
      },
      {
        category: "monitors",
        displayCategory: "شاشات",
        baseName: "Gaming Monitor",
        min: 900,
        max: 2800,
      },
      {
        category: "consoles",
        displayCategory: "أجهزة لعب (Sony/Xbox)",
        baseName: "Gaming Console",
        min: 1800,
        max: 3500,
      },
      {
        category: "accessories",
        displayCategory: "إكسسوارات",
        baseName: "Tech Accessory",
        min: 50,
        max: 400,
      },
      {
        category: "subscriptions",
        displayCategory: "اشتراكات مشاهدة",
        baseName: "Streaming Plan",
        min: 20,
        max: 200,
      },
      {
        category: "subscriptions",
        displayCategory: "اشتراكات ألعاب",
        baseName: "Game Pass",
        min: 30,
        max: 250,
      },
      {
        category: "audio",
        displayCategory: "سماعات احترافية",
        baseName: "Studio Headphones",
        min: 500,
        max: 1800,
      },
    ];

    // 10 منتجات لكل مجموعة = 100 منتج
    for (const group of groups) {
      for (let i = 1; i <= 10; i++) {
        products.push({
          id: id++,
          name: `${group.baseName} ${i}`,
          category: group.category, // slug للفلترة
          displayCategory: group.displayCategory, // يظهر للمستخدم بالعربي
          price: rand(group.min, group.max),
          description: `منتج ${group.baseName} رقم ${i} مناسب للاستخدام اليومي بجودة عالية.`,
        });
      }
    }

    db.data.products = products;
    console.log("✅ Seeded products:", products.length);
  }

  await db.write();
  console.log(
    "Database initialized ✅ | products:",
    db.data.products.length,
    "| users:",
    db.data.users.length
  );
}

// ============================
//    API: Auth (تسجيل / دخول)
// ============================

// تسجيل جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "الاسم والإيميل وكلمة المرور مطلوبة",
    });
  }

  await db.read();
  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({
      success: false,
      message: "هذا البريد مستخدم من قبل",
    });
  }

  const newId = db.data.users.length
    ? Math.max(...db.data.users.map((u) => u.id)) + 1
    : 1;

  const user = {
    id: newId,
    name,
    email,
    password, // بدون تشفير للتجربة
    role: "user",
    createdAt: new Date().toISOString(),
  };

  db.data.users.push(user);
  await db.write();

  res.json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
  });
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "الإيميل وكلمة المرور مطلوبة",
    });
  }

  await db.read();

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
  }

  // نرسل بيانات المستخدم بدون كلمة المرور
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.json({
    success: true,
    user: safeUser,
  });
});

// ============================
//   API: Products & Users
// ============================

// جميع المنتجات للمتجر
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// المنتجات للأدمن
app.get("/api/admin/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// إضافة منتج جديد من لوحة الأدمن
app.post("/api/admin/products", async (req, res) => {
  const { name, price, category, description } = req.body || {};

  if (!name || !price) {
    return res.status(400).json({
      success: false,
      message: "الاسم والسعر مطلوبان",
    });
  }

  await db.read();

  const list = db.data.products || [];
  const newId = list.length ? Math.max(...list.map((p) => p.id)) + 1 : 1;

  const product = {
    id: newId,
    name,
    price: Number(price),
    category: category || "other",
    displayCategory: category || "غير مصنّف",
    description: description || "",
  };

  db.data.products.push(product);
  await db.write();

  res.status(201).json({
    success: true,
    product,
  });
});

// حذف منتج
app.delete("/api/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.read();

  const before = db.data.products.length;
  db.data.products = db.data.products.filter((p) => p.id !== id);

  if (db.data.products.length === before) {
    return res
      .status(404)
      .json({ success: false, message: "المنتج غير موجود" });
  }

  await db.write();
  res.json({ success: true });
});

// إرجاع المستخدمين (لا تظهر الباسورد)
app.get("/api/users", async (req, res) => {
  await db.read();
  const users = (db.data.users || []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

// ============================
//   Serve Frontend
// ============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirnameResolved, "public", "index.html"));
});

// ============================
//   Start Server
// ============================

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
});