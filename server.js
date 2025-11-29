const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// === Default data (لأول مرة فقط) ===
const defaultData = {
  users: [
    {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // فقط للتجارب، لا تستخدمه في مشروع حقيقي
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

// === Initialize database ===
async function initDB() {
  await db.read();

  if (!db.data) {
    db.data = defaultData;
    await db.write();
    console.log("DB initialized with default data");
  } else {
    // تأكد أن المفاتيح موجودة
    db.data.users ||= [];
    db.data.products ||= [];
    await db.write();
  }
}

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// نتاكد أن الـ DB جاهزة قبل أي طلب
app.use(async (req, res, next) => {
  await initDB();
  next();
});

// ====== PRODUCTS API ======

// GET all products
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// ADD new product
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, category, image, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "name و price مطلوبين" });
    }

    await db.read();
    db.data.products ||= [];

    const newProduct = {
      id: Date.now(),
      name,
      price: Number(price),
      category: category || "",
      image: image || "",
      description: description || "",
    };

    db.data.products.push(newProduct);
    await db.write();

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ====== AUTH & USERS API ======

// Register new user
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "كل الحقول مطلوبة" });
  }

  await db.read();
  db.data.users ||= [];

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "هذا الإيميل مسجّل من قبل" });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password, // للتجربة فقط
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  // نرجع البيانات بدون الباسوورد
  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  await db.read();
  db.data.users ||= [];

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// Get users list for admin dashboard
app.get("/api/users", async (req, res) => {
  await db.read();
  db.data.users ||= [];

  // لا نرجع الباسوورد في الـ API (أفضل أمانًا)
  const usersWithoutPassword = db.data.users.map(({ password, ...rest }) => rest);
  res.json(usersWithoutPassword);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});