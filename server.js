const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// default data لازم يُمرَّر للـ constructor في النسخة الجديدة من lowdb
const defaultData = {
  users: [
    {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      password: "admin123", // فقط للتجربة
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

// هنا نمرّر الـ defaultData عشان ما يطلع خطأ "missing default data"
const db = new Low(adapter, defaultData);

// helper عشان نتأكد إن الـ DB متضبوطة قبل أي عملية
async function ensureDB() {
  await db.read();

  if (!db.data) {
    db.data = defaultData;
    await db.write();
  } else {
    db.data.users ||= [];
    db.data.products ||= [];
  }
}

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== PRODUCTS API =====

// جلب كل المنتجات
app.get("/api/products", async (req, res) => {
  await ensureDB();
  res.json(db.data.products || []);
});

// إضافة منتج جديد
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, category, image, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "name و price مطلوبين" });
    }

    await ensureDB();

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

// ===== AUTH & USERS API =====

// تسجيل جديد
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "كل الحقول مطلوبة" });
  }

  await ensureDB();

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

  res.status(201).json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  });
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  await ensureDB();

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

// جلب المستخدمين (للأدمن)
app.get("/api/users", async (req, res) => {
  await ensureDB();
  const usersWithoutPassword = db.data.users.map(({ password, ...rest }) => rest);
  res.json(usersWithoutPassword);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});