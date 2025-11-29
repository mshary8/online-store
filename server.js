// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// default data لو الملف فاضي أو غير موجود
const defaultData = {
  users: [
    {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // للتجربة فقط، لا تستخدمه في موقع حقيقي
      role: "admin",
    },
  ],
  products: [
    {
      id: 1,
      name: "Nike Shoes",
      price: 199,
      category: "Sport",
      image: "shoes.jpg",
      description: "Modern running shoes",
    },
    {
      id: 2,
      name: "Apple Watch",
      price: 299,
      category: "Electronics",
      image: "watch.jpg",
      description: "Smart fitness watch",
    },
  ],
};

const db = new Low(adapter, defaultData);

// === Helpers ===
function nextId(items) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id || 0)) + 1;
}

async function initDB() {
  await db.read();

  if (!db.data) {
    db.data = defaultData;
  }

  db.data.users ||= [];
  db.data.products ||= [];

  // تأكد أن فيه أدمن واحد على الأقل
  const hasAdmin = db.data.users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    db.data.users.push({
      id: nextId(db.data.users),
      name: "Admin",
      email: "admin@example.com",
      password: "admin123",
      role: "admin",
    });
  }

  await db.write();
  console.log("Database initialized ✅");
}

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// نادينا التهيئة
initDB().catch((err) => {
  console.error("Error initializing DB:", err);
});

// === Products API ===

// جميع المنتجات
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// إضافة منتج جديد (تستخدمها لوحة الأدمن)
app.post("/api/products", async (req, res) => {
  const { name, price, category, image, description } = req.body;

  if (!name || !price || !category || !image) {
    return res
      .status(400)
      .json({ message: "الاسم، السعر، الفئة، واسم الصورة حقول مطلوبة" });
  }

  await db.read();

  const newProduct = {
    id: nextId(db.data.products),
    name,
    price: Number(price),
    category,
    image,
    description: description || "",
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

// === Auth API (register / login / users list) ===

// تسجيل جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "الاسم والإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "هذا الإيميل مسجّل من قبل" });
  }

  const newUser = {
    id: nextId(db.data.users),
    name,
    email,
    password, // للتجربة فقط، في الواقع لازم hashing
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  });
});

// تسجيل دخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  await db.read();

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  }

  // نرجّع بيانات بدون كلمة المرور
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// قائمة المستخدمين (للوحة الأدمن)
app.get("/api/users", async (req, res) => {
  await db.read();

  // من باب الأمان: ما نرجّع الباسورد، إذا تحب تشوفه للتجربة فقط أضفه هنا
  const users = (db.data.users || []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    // password: u.password, // لو تبي تشوفه، فك الكومنت (للتجربة فقط!)
  }));

  res.json(users);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});