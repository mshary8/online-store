import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== LowDB ==================
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const defaultData = { users: [], products: [], orders: [] };
const db = new Low(adapter, defaultData);

await db.read();
if (!db.data) db.data = { ...defaultData };

db.data.users ||= [];
db.data.products ||= [];
db.data.orders ||= [];

// تأكد من وجود الأدمن
let admin = db.data.users.find((u) => u.email === "meshari@gmail.com");
if (!admin) {
  admin = {
    id: 1,
    name: "Meshari",
    email: "meshari@gmail.com",
    password: "1234561", // للتجربة فقط (بدون تشفير)
    role: "admin"
  };
  db.data.users.push(admin);
  await db.write();
}

console.log("DB initialized:", {
  users: db.data.users.length,
  products: db.data.products.length
});

// ================== Express ==================
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مجلد الملفات الثابتة
const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(publicDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.static(publicDir));
app.use("/uploads", express.static(uploadsDir));

// ================== Multer ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + "-" + unique + ext);
  }
});
const upload = multer({ storage });

// ================== Auth APIs ==================

// Register
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الاسم والإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();
  db.data.users ||= [];
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
    password, // للتجربة فقط
    role: "user"
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({
    success: true,
    message: "تم إنشاء الحساب بنجاح",
    user: { id: newUser.id, name, email, role: newUser.role }
  });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "الإيميل وكلمة المرور مطلوبة" });
  }

  await db.read();
  const user = (db.data.users || []).find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// ================== Products APIs ==================

// Get all products (store + admin)
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products || []);
});

// Add product (admin panel) with optional image
app.post("/api/admin/products", upload.single("image"), async (req, res) => {
  const { name, price, category, description } = req.body || {};
  if (!name || !price) {
    return res
      .status(400)
      .json({ success: false, message: "اسم المنتج والسعر مطلوبان" });
  }

  await db.read();
  db.data.products ||= [];

  const newId = db.data.products.length
    ? Math.max(...db.data.products.map((p) => p.id)) + 1
    : 1;

  const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

  const newProduct = {
    id: newId,
    name,
    price: Number(price),
    category: category || "",
    description: description || "",
    image: imagePath
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

// Delete product
app.delete("/api/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.read();
  db.data.products ||= [];

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

// List users (for admin panel if needed)
app.get("/api/admin/users", async (req, res) => {
  await db.read();
  res.json(db.data.users || []);
});

// Fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});