// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// بيانات افتراضية (defaultData) لأول تشغيل
const defaultData = {
  products: [
    {
      id: 1,
      name: "Nike Shoes",
      description: "Modern running shoes",
      price: 199,
      image: "shoes.jpg",
      category: "Sport",
    },
    {
      id: 2,
      name: "Apple Watch",
      description: "Smart fitness watch",
      price: 299,
      image: "watch.jpg",
      category: "Electronics",
    },
  ],
  users: [
    {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // للتجربة فقط (في الحقيقة لازم تشفير)
      role: "admin",
    },
  ],
};

const db = new Low(adapter, defaultData);

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === Initialize database ===
async function initDB() {
  await db.read();

  // لو ما فيه data نستخدم defaultData
  if (!db.data) {
    db.data = defaultData;
  }

  // تأكد إن المصفوفات موجودة دائمًا
  if (!db.data.products) db.data.products = defaultData.products;
  if (!db.data.users || db.data.users.length === 0) {
    db.data.users = defaultData.users;
  }

  await db.write();
  console.log("Database initialized ✅");
}
initDB();

// === API: Products ===
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

// === API: Register (تسجيل جديد) ===
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "البيانات ناقصة" });
  }

  await db.read();

  const existing = db.data.users.find((u) => u.email === email);
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "البريد مستخدم من قبل" });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password, // للتجربة فقط بدون تشفير
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({ success: true, message: "تم إنشاء الحساب بنجاح، سجل الدخول الآن" });
});

// === API: Login (تسجيل دخول) ===
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الرجاء إدخال البريد وكلمة المرور" });
  }

  await db.read();
  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "بيانات الدخول غير صحيحة" });
  }

  // token بسيط للتجربة فقط (مو آمن للإنتاج)
  const token = `token-${user.id}-${Date.now()}`;

  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    name: user.name,
    isAdmin: user.role === "admin",
    token,
  });
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});