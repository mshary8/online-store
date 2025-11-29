const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// default data object required by lowdb v6
const defaultData = { users: [], products: [] };
const db = new Low(adapter, defaultData);

// helper to generate 100 products in 10 different categories
function createInitialProducts() {
  const products = [];
  let id = 1;

  function addBatch(category, baseName, priceStart, imagePrefix) {
    for (let i = 1; i <= 10; i++) {
      products.push({
        id: id++,
        name: `${baseName} ${i}`,
        price: priceStart + i * 10,
        category,
        image: `${imagePrefix}${i}.jpg`,
        description: `منتج ${baseName} رقم ${i} بجودة عالية مناسب للاستخدام اليومي.`
      });
    }
  }

  // 1–10: إلكترونيات - لابتوبات
  addBatch("إلكترونيات - لابتوبات", "Laptop Pro", 2499, "laptop");

  // 11–20: إلكترونيات - جوالات
  addBatch("إلكترونيات - جوالات", "Smartphone X", 1499, "phone");

  // 21–30: إلكترونيات - سماعات
  addBatch("إلكترونيات - سماعات", "Wireless Headphones", 299, "headphones");

  // 31–40: أجهزة ترفيه (Sony / Xbox)
  addBatch(
    "إلكترونيات - أجهزة ترفيه (Sony / Xbox)",
    "Gaming Console",
    1899,
    "console"
  );

  // 41–50: اشتراكات تطبيقات مشاهدة
  addBatch(
    "اشتراكات - تطبيقات مشاهدة",
    "Streaming Subscription",
    29,
    "subscription"
  );

  // 51–60: شاشات عرض
  addBatch("إلكترونيات - شاشات عرض", "4K Monitor", 799, "monitor");

  // 61–70: ساعات ذكية
  addBatch("إلكترونيات - ساعات ذكية", "Smart Watch", 399, "watch");

  // 71–80: لوحات مفاتيح وفأرات للألعاب
  addBatch(
    "إلكترونيات - لوحات مفاتيح وفأرات",
    "Gaming Keyboard & Mouse",
    149,
    "peripheral"
  );

  // 81–90: أجهزة شبكة (راوتر / واي فاي)
  addBatch(
    "إلكترونيات - أجهزة شبكة (راوتر/واي فاي)",
    "WiFi Router",
    199,
    "router"
  );

  // 91–100: إكسسوارات تقنية (كابلات / حافظات)
  addBatch(
    "إلكترونيات - إكسسوارات (كابلات وحافظات)",
    "Tech Accessory",
    39,
    "accessory"
  );

  return products;
}

// initialize DB once
async function initDB() {
  await db.read();
  db.data ||= { users: [], products: [] };

  // seed admin user if missing
  if (!Array.isArray(db.data.users) || db.data.users.length === 0) {
    db.data.users = [
      {
        id: 1,
        name: "Admin",
        email: "admin@example.com",
        password: "admin123", // تجربة فقط
        role: "admin",
      },
    ];
  }

  // seed 100 products only if products array فارغة
  if (!Array.isArray(db.data.products) || db.data.products.length === 0) {
    db.data.products = createInitialProducts();
  }

  await db.write();
  console.log("Database initialized ✅");
}

initDB().catch((err) => {
  console.error("Error initializing DB:", err);
});

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === API: Products ===

// GET all products
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// ADD new product (for admin panel)
app.post("/api/products", async (req, res) => {
  const { name, price, category, image, description } = req.body;

  if (!name || !price || !category) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والسعر والتصنيف حقول مطلوبة" });
  }

  await db.read();
  db.data.products ||= [];

  const newProduct = {
    id: db.data.products.length
      ? Math.max(...db.data.products.map((p) => p.id || 0)) + 1
      : 1,
    name,
    price: Number(price),
    category,
    image: image || "",
    description: description || "",
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

// === API: Register ===
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "الاسم والإيميل وكلمة المرور مطلوبة",
      });
  }

  await db.read();
  db.data.users ||= [];

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "هذا الإيميل مسجّل من قبل" });
  }

  const newUser = {
    id: db.data.users.length
      ? Math.max(...db.data.users.map((u) => u.id || 0)) + 1
      : 1,
    name,
    email,
    password, // بدون تشفير لأغراض التعلم فقط
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({
    success: true,
    message: "تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن",
  });
});

// === API: Login ===
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "الرجاء إدخال البريد وكلمة المرور",
      });
  }

  await db.read();
  db.data.users ||= [];

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "بيانات الدخول غير صحيحة" });
  }

  const token = `token-${user.id}-${Date.now()}`;

  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    name: user.name,
    isAdmin: user.role === "admin",
    token,
  });
});

// === API: Users list for admin ===
app.get("/api/users", async (req, res) => {
  await db.read();
  db.data.users ||= [];

  const users = db.data.users.map(({ password, ...rest }) => rest);
  res.json(users);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});