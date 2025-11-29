import express from "express";
import session from "express-session";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// LowDB
// ---------------------------
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [], products: [], orders: [] });

await db.read();

if (!db.data || Object.keys(db.data).length === 0) {
  db.data = {
    users: [],
    products: [],
    orders: []
  };
  await db.write();
}

// ---------------------------
// SESSION
// ---------------------------
app.use(
  session({
    secret: "STORE_SECRET",
    saveUninitialized: false,
    resave: false,
  })
);

// ---------------------------
// STATIC FILES
// ---------------------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------
// API ROUTES
// ---------------------------

// تسجيل مستخدم
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  const exists = db.data.users.find((u) => u.email === email);
  if (exists) return res.json({ success: false, message: "البريد موجود" });

  const id = Date.now();
  db.data.users.push({ id, name, email, password, role: "user" });
  await db.write();

  res.json({ success: true });
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) return res.json({ success: false });

  req.session.user = user;
  res.json({ success: true, user });
});

// جلب المنتجات
app.get("/api/products", async (req, res) => {
  res.json(db.data.products);
});

// إضافة منتج
app.post("/api/products", async (req, res) => {
  const { name, price, category, description, image } = req.body;

  const id = Date.now();
  const newProduct = { id, name, price, category, description, image };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

// جلب مستخدمين
app.get("/api/users", async (req, res) => {
  res.json(db.data.users);
});

// ---------------------------
// SERVER START
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});