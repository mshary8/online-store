const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// === Initialize database ===
async function initDB() {
  await db.read();

  // لو الملف فاضي أو ناقص، نعطيه قيم افتراضية
  db.data ||= {
    products: [],
    users: [],
  };

  // لو ما فيه أدمن نضيف واحد افتراضي
  const hasAdmin = db.data.users.some((u) => u.role === "admin");
  if (!hasAdmin) {
    const passwordHash = await bcrypt.hash("123456", 10); // غيّرها بعدين
    db.data.users.push({
      id: Date.now(),
      username: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    });
    await db.write();
    console.log("Default admin created: admin@example.com / 123456");
  }
}

initDB();

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// سيشن بسيط للتجربة
app.use(
  session({
    secret: "change_this_secret", // يفضّل تحطه في متغير بيئة
    resave: false,
    saveUninitialized: false,
  })
);

// ملفات الواجهة
app.use(express.static(path.join(__dirname, "public")));

// ===== Middlewares للحماية =====
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// ===== Auth APIs =====

// ✅ تسجيل جديد (User عادي)
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "جميع الحقول مطلوبة" });
  }

  await db.read();
  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "الإيميل مستخدم من قبل" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    username,
    email,
    passwordHash,
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  req.session.user = {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
  };

  res.json({ user: req.session.user });
});

// ✅ تسجيل دخول
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  await db.read();

  const user = db.data.users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  res.json({ user: req.session.user });
});

// ✅ تسجيل خروج
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// ✅ من أنا؟
app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ===== Products Public API =====
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

// ===== Admin Products API =====
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, description, price, image, category } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: "الاسم والسعر ضروريان" });
  }

  await db.read();
  const newProduct = {
    id: Date.now(),
    name,
    description: description || "",
    price: Number(price),
    image: image || "",
    category: category || "",
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json(newProduct);
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.read();
  const index = db.data.products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "المنتج غير موجود" });
  }

  const removed = db.data.products.splice(index, 1)[0];
  await db.write();
  res.json(removed);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});