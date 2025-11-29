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

// ------------------------------
// LOWDB SETUP
// ------------------------------
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [], products: [], orders: [] });

await db.read();

// إذا كان فارغ → نعبّيه ببيانات افتراضية
if (!db.data || Object.keys(db.data).length === 0) {
  db.data = {
    users: [
      {
        id: 1,
        name: "Meshari",
        email: "meshari@gmail.com",
        password: "1234561",
        role: "admin"
      }
    ],
    products: [],
    orders: []
  };

  await db.write();
}

console.log("Database initialized:", db.data);

// ------------------------------
// SESSION
// ------------------------------
app.use(
  session({
    secret: "STORE_SECRET",
    saveUninitialized: false,
    resave: false,
  })
);

// ------------------------------
// API ROUTES
// ------------------------------

// تسجيل دخول
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "بيانات غير صحيحة" });
  }

  req.session.user = user;
  res.json({ success: true, user });
});

// جميع المنتجات
app.get("/api/products", async (req, res) => {
  res.json(db.data.products);
});

// إضافة منتج
app.post("/api/products", async (req, res) => {
  const { name, price, category, image, description } = req.body;

  const newProduct = {
    id: Date.now(),
    name,
    price,
    category,
    image,
    description,
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true, product: newProduct });
});

// ------------------------------
// STATIC FILES
// ------------------------------
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);