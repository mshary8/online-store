// server.js (ESM)

// ====================== Imports ======================
import express from "express";
import cors from "cors";
import session from "express-session";
import crypto from "crypto";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

// ====================== Paths ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================== LowDB Setup ======================
const dbFile = path.join(__dirname, "db.json");

// بيانات افتراضية (مهم عشان ما يطلع خطأ: lowdb: missing default data)
const defaultData = {
  users: [],
  products: [],
  orders: []
};

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, defaultData);

// دالة هاش لكلمة المرور
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// تهيئة قاعدة البيانات (أدمن + منتجات)
async function initDB() {
  await db.read();

  if (!db.data) {
    db.data = { ...defaultData };
  }

  if (!Array.isArray(db.data.users)) db.data.users = [];
  if (!Array.isArray(db.data.products)) db.data.products = [];
  if (!Array.isArray(db.data.orders)) db.data.orders = [];

  // ---- إنشاء مستخدم أدمن لو غير موجود ----
  const adminEmail = "meshari@gmail.com";
  const adminPassword = "1234561";

  let admin = db.data.users.find((u) => u.email === adminEmail);

  if (!admin) {
    admin = {
      id: 1,
      name: "Meshari Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      createdAt: new Date().toISOString()
    };
    db.data.users.push(admin);
    console.log("✅ Admin user created:", adminEmail, "/", adminPassword);
  }

  // ---- منتجات تجريبية لو ما فيه منتجات ----
  if (!db.data.products || db.data.products.length === 0) {
    const products = [
      {
        id: 1,
        name: "Laptop Pro 1",
        price: 3999,
        category: "لابتوبات",
        tag: "laptops",
        image: "laptop1.jpg",
        description: "لابتوب احترافي للاستخدام اليومي."
      },
      {
        id: 2,
        name: "Laptop Pro 2",
        price: 4999,
        category: "لابتوبات",
        tag: "laptops",
        image: "laptop2.jpg",
        description: "لابتوب مميز للأعمال والمهام الثقيلة."
      },
      {
        id: 3,
        name: "Sony PS5",
        price: 2599,
        category: "أجهزة ترفيهية",
        tag: "consoles",
        image: "ps5.jpg",
        description: "بلايستيشن 5 الإصدار الأحدث لعشاق الألعاب."
      },
      {
        id: 4,
        name: "AirPods Pro",
        price: 899,
        category: "سماعات",
        tag: "audio",
        image: "airpods.jpg",
        description: "سماعات لاسلكية بعزل ضوضاء احترافي."
      },
      {
        id: 5,
        name: "iPhone 15",
        price: 4999,
        category: "جوالات",
        tag: "phones",
        image: "iphone15.jpg",
        description: "أحدث إصدارات آيفون بتقنيات متقدمة."
      }
    ];

    db.data.products = products;
    console.log("✅ Seeded demo products:", products.length);
  }

  await db.write();

  console.log(
    "Database initialized ✅ | products:",
    db.data.products.length,
    "| users:",
    db.data.users.length
  );
}

// ====================== Express App ======================
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// (اختياري) جلسات – حالياً لا نستخدمها لحماية حقيقية، لكن ممكن تطورها لاحقاً
app.use(
  session({
    secret: "MESHARI_TECH_STORE_SECRET",
    resave: false,
    saveUninitialized: false
  })
);

// ملفات الواجهة (HTML/CSS/JS داخل مجلد public)
app.use(express.static(path.join(__dirname, "public")));

// ====================== Auth APIs ======================

// تسجيل جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();
  if (!Array.isArray(db.data.users)) db.data.users = [];

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "هذا البريد الإلكتروني مستخدم من قبل" });
  }

  const newUser = {
    id: db.data.users.length
      ? Math.max(...db.data.users.map((u) => u.id)) + 1
      : 1,
    name,
    email,
    passwordHash: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString()
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({ success: true, message: "تم إنشاء الحساب بنجاح ✅" });
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
  if (!Array.isArray(db.data.users)) db.data.users = [];

  const user = db.data.users.find(
    (u) => u.email === email && u.passwordHash === hashPassword(password)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.role === "admin"
  };

  res.json({
    success: true,
    user: safeUser
  });
});

// ====================== Products APIs ======================

// كل المنتجات
app.get("/api/products", async (_req, res) => {
  await db.read();
  if (!Array.isArray(db.data.products)) db.data.products = [];
  res.json(db.data.products);
});

// منتجات الأدمن (نفسها حالياً، بدون حماية حقيقية)
app.get("/api/admin/products", async (_req, res) => {
  await db.read();
  if (!Array.isArray(db.data.products)) db.data.products = [];
  res.json(db.data.products);
});

// إضافة منتج جديد
app.post("/api/admin/products", async (req, res) => {
  const { name, price, category, tag, image, description } = req.body || {};

  if (!name || !price) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والسعر مطلوبان" });
  }

  await db.read();
  if (!Array.isArray(db.data.products)) db.data.products = [];

  const newProduct = {
    id: db.data.products.length
      ? Math.max(...db.data.products.map((p) => p.id)) + 1
      : 1,
    name,
    price: Number(price),
    category: category || "",
    tag: tag || "",
    image: image || "",
    description: description || ""
  };

  db.data.products.push(newProduct);
  await db.write();

  res.status(201).json({ success: true, product: newProduct });
});

// حذف منتج
app.delete("/api/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);

  await db.read();
  if (!Array.isArray(db.data.products)) db.data.products = [];

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

// ====================== Users List (للأدمن) ======================
app.get("/api/users", async (_req, res) => {
  await db.read();
  if (!Array.isArray(db.data.users)) db.data.users = [];

  const safeUsers = db.data.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));

  res.json(safeUsers);
});

// ====================== Static Root ======================
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====================== Start Server ======================
await initDB();

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});