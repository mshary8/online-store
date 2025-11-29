const express = require("express");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const app = express();

const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

// ---------------- INIT DATABASE ----------------
async function initDB() {
  await db.read();

  if (!db.data) {
    db.data = { users: [], products: [] };
  }

  if (!db.data.users) db.data.users = [];
  if (!db.data.products) db.data.products = [];

  // Admin user
  if (!db.data.users.find((u) => u.email === "meshari@gmail.com")) {
    db.data.users.push({
      id: Date.now(),
      name: "Meshari",
      email: "meshari@gmail.com",
      password: "1234561",
      role: "admin",
    });
    console.log("✔ Created admin account");
  }

  // Seed 100 products
  if (db.data.products.length === 0) {
    for (let i = 1; i <= 100; i++) {
      db.data.products.push({
        id: i,
        name: `Laptop Pro ${i}`,
        price: 2000 + i,
        category: "لابتوبات",
        image: "",
        description: `وصف لابتوب رقم ${i}`,
      });
    }
    console.log("✔ Seeded 100 demo products");
  }

  await db.write();
  console.log("Database initialized.");
}
initDB();

// ------------------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secret123",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static("public"));

// ---------------- API ENDPOINTS ----------------

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  await db.read();
  const user = db.data.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) return res.json({ success: false, message: "خطأ في البيانات" });

  req.session.user = user;

  res.json({ success: true, user });
});

// Register
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  await db.read();

  if (db.data.users.find((u) => u.email === email)) {
    return res.json({ success: false, message: "البريد مستخدم" });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role: "user",
  };

  db.data.users.push(newUser);
  await db.write();

  res.json({ success: true });
});

// Get products
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

// Add product (admin)
app.post("/api/products", async (req, res) => {
  const { name, price, category, image, description } = req.body;

  await db.read();

  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price),
    category,
    image,
    description,
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json({ success: true });
});

// Users list (admin)
app.get("/api/users", async (req, res) => {
  await db.read();
  res.json(db.data.users);
});

// ------------------------------------------------------------

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});