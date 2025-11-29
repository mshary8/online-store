// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");

// === إعداد lowdb ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");

const defaultData = {
  products: [],
  users: [],
  sessions: [],
};

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, defaultData);

// دالة هاش بسيطة لكلمة المرور
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// === تهيئة قاعدة البيانات + إضافة الأدمن والمنتجات ===
async function initDB() {
  await db.read();
  if (!db.data) db.data = { ...defaultData };

  // 1) إنشاء حساب الأدمن لو مش موجود
  const adminEmail = "meshari@gmail.com";
  const adminPassword = "1234561";

  if (!db.data.users) db.data.users = [];

  let admin = db.data.users.find((u) => u.email === adminEmail);

  if (!admin) {
    admin = {
      id: 1,
      name: "Meshari Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    db.data.users.push(admin);
    console.log("✅ Admin user created:", adminEmail);
  }

  // 2) توليد 100 منتج لو القائمة فاضية
  if (!db.data.products || db.data.products.length === 0) {
    const products = [];
    let id = 1;

    function rand(min, max) {
      return Math.round(min + Math.random() * (max - min));
    }

    const groups = [
      {
        category: "الإلكترونيات › لابتوبات 💻",
        baseName: "Laptop Pro",
        min: 2500,
        max: 6000,
        image: "laptop.jpg",
      },
      {
        category: "الإلكترونيات › الجوالات 📱",
        baseName: "Smart Phone",
        min: 1500,
        max: 4500,
        image: "phone.jpg",
      },
      {
        category: "الإلكترونيات › التابلت 📲",
        baseName: "Tablet Plus",
        min: 900,
        max: 3000,
        image: "tablet.jpg",
      },
      {
        category: "الإلكترونيات › السماعات 🎧",
        baseName: "Wireless Headset",
        min: 200,
        max: 900,
        image: "headset.jpg",
      },
      {
        category: "الإلكترونيات › الساعات الذكية ⌚",
        baseName: "Smart Watch",
        min: 300,
        max: 1500,
        image: "watch.jpg",
      },
      {
        category: "أجهزة الترفيه › (Sony / Xbox) 🎮",
        baseName: "Gaming Console",
        min: 1800,
        max: 3500,
        image: "console.jpg",
      },
      {
        category: "أجهزة الترفيه › شاشات الألعاب 🖥️",
        baseName: "Gaming Monitor",
        min: 900,
        max: 2800,
        image: "monitor.jpg",
      },
      {
        category: "أجهزة الترفيه › اشتراكات الألعاب 🎫",
        baseName: "Game Subscription",
        min: 50,
        max: 400,
        image: "gamepass.jpg",
      },
      {
        category: "الإلكترونيات › الإكسسوارات 🎒",
        baseName: "Tech Accessory",
        min: 50,
        max: 400,
        image: "accessory.jpg",
      },
      {
        category: "الترفيه › اشتراكات المشاهدة 📺",
        baseName: "Streaming Plan",
        min: 25,
        max: 150,
        image: "streaming.jpg",
      },
    ];

    // 10 منتجات لكل مجموعة = 100 منتج
    for (const group of groups) {
      for (let i = 1; i <= 10; i++) {
        products.push({
          id: id++,
          name: `${group.baseName} ${i}`,
          category: group.category,
          price: rand(group.min, group.max),
          description: `منتج ${group.baseName} رقم ${i} مناسب للاستخدام اليومي بجودة عالية.`,
          image: group.image,
        });
      }
    }

    db.data.products = products;
    console.log("✅ Seeded products:", products.length);
  }

  await db.write();
  console.log(
    "Database initialized ✅",
    "| products:",
    db.data.products.length,
    "| users:",
    db.data.users.length
  );
}

// === إعداد السيرفر ===
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "meshari-tech-store-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ملفات الواجهة (Front-end)
app.use(express.static(path.join(__dirname, "public")));

// مساعدة: جلب المستخدم من السيشن
async function getCurrentUser(req) {
  await db.read();
  if (!req.session.userId) return null;
  return db.data.users.find((u) => u.id === req.session.userId) || null;
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "غير مسموح" });
  }
  next();
}

async function requireAdmin(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ success: false, message: "صلاحيات غير كافية" });
  }
  req.user = user;
  next();
}

// === Auth APIs ===

// تسجيل جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();
  if (!db.data.users) db.data.users = [];

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "هذا البريد مستخدم من قبل" });
  }

  const newUser = {
    id: db.data.users.length
      ? Math.max(...db.data.users.map((u) => u.id)) + 1
      : 1,
    name,
    email,
    passwordHash: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString(),
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({ success: true, message: "تم إنشاء الحساب بنجاح" });
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();
  const user = db.data.users.find(
    (u) => u.email === email && u.passwordHash === hashPassword(password)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
  }

  req.session.userId = user.id;

  res.json({
    success: true,
    name: user.name,
    email: user.email,
    isAdmin: user.role === "admin",
    token: "session", // فقط للتوافق مع الكود في الواجهة
  });
});

// من أنا؟
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

// تسجيل خروج
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// === APIs للمنتجات ===

// كل المنتجات (لواجهة المتجر)
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// منتجات الأدمن
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// إضافة منتج من لوحة الإدارة
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, price, category, image, description } = req.body || {};
  if (!name || !price) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والسعر مطلوبان" });
  }

  await db.read();
  if (!db.data.products) db.data.products = [];

  const newProduct = {
    id: db.data.products.length
      ? Math.max(...db.data.products.map((p) => p.id)) + 1
      : 1,
    name,
    price: Number(price),
    category: category || "",
    image: image || "",
    description: description || "",
  };

  db.data.products.push(newProduct);
  await db.write();

  res.status(201).json({ success: true, product: newProduct });
});

// حذف منتج
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.read();

  const before = db.data.products.length;
  db.data.products = db.data.products.filter((p) => p.id !== id);

  if (db.data.products.length === before) {
    return res.status(404).json({ success: false, message: "المنتج غير موجود" });
  }

  await db.write();
  res.json({ success: true });
});

// توجيه / إلى index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// تشغيل السيرفر بعد تهيئة قاعدة البيانات
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
}

start();