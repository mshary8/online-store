const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

// ====== PATHS ======
const __dirnameResolved = path.resolve();
const DB_FILE = path.join(__dirnameResolved, "db.json");
const UPLOADS_DIR = path.join(__dirnameResolved, "uploads");
const PUBLIC_DIR = path.join(__dirnameResolved, "public");

// ====== HELPERS: DB READ/WRITE ======
async function readDB() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw);

    return {
      users: Array.isArray(data.users) ? data.users : [],
      products: Array.isArray(data.products) ? data.products : []
    };
  } catch (err) {
    if (err.code === "ENOENT") {
      // file not found → empty db
      return { users: [], products: [] };
    }
    throw err;
  }
}

async function writeDB(data) {
  const toWrite = {
    users: Array.isArray(data.users) ? data.users : [],
    products: Array.isArray(data.products) ? data.products : []
  };
  await fs.writeFile(DB_FILE, JSON.stringify(toWrite, null, 2), "utf8");
}

// ====== INIT: ensure uploads dir + admin user ======
async function init() {
  // ensure uploads folder exists
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  let db = await readDB();

  // ensure admin user exists
  const adminEmail = "meshari@gmail.com";
  const adminPassword = "1234561";

  let admin = db.users.find((u) => u.email === adminEmail);
  if (!admin) {
    const newAdmin = {
      id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
      name: "Meshari Admin",
      email: adminEmail,
      password: adminPassword, // plain text for learning (NOT secure in real life)
      role: "admin"
    };
    db.users.push(newAdmin);
    console.log("✅ Admin created:", adminEmail, "/", adminPassword);
  }

  // no products seeded → you will add from admin panel
  await writeDB(db);
  console.log("✅ DB initialized");
}

// ====== MULTER (UPLOAD) CONFIG ======
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  }
});

const upload = multer({ storage });

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

// ====== AUTH API ======

// Register
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Name, email and password are required" });
  }

  const db = await readDB();
  const exists = db.users.find((u) => u.email === email);
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "Email already in use" });
  }

  const newUser = {
    id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
    name,
    email,
    password,
    role: "user"
  };

  db.users.push(newUser);
  await writeDB(db);

  res.json({ success: true, message: "Account created successfully" });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const db = await readDB();
  const user = db.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
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

// ====== PRODUCTS API ======

// Get all products
app.get("/api/products", async (req, res) => {
  const db = await readDB();
  res.json(db.products);
});

// Add product (admin) with optional image
app.post(
  "/api/admin/products",
  upload.single("image"),
  async (req, res) => {
    const { name, price, category, description } = req.body || {};
    if (!name || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Name and price are required" });
    }

    const db = await readDB();

    const newProduct = {
      id: db.products.length
        ? Math.max(...db.products.map((p) => p.id)) + 1
        : 1,
      name,
      price: Number(price),
      category: category || "",
      description: description || "",
      image: req.file ? `/uploads/${req.file.filename}` : ""
    };

    db.products.push(newProduct);
    await writeDB(db);

    res.status(201).json({ success: true, product: newProduct });
  }
);

// Delete product (admin)
app.delete("/api/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const db = await readDB();

  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== id);

  if (db.products.length === before) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  await writeDB(db);
  res.json({ success: true });
});

// ====== FALLBACK: serve index.html for unknown paths (SPA-ish) ======
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ====== START SERVER AFTER INIT ======
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  })
  .catch((err) => {
    console.error("Error initializing DB", err);
    process.exit(1);
  });