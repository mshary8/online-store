
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// === Middlewares ===
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === Database setup (SQLite) ===
const db = new sqlite3.Database(path.join(__dirname, 'shop.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0
    )
  `);

  // Seed data if empty
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (err) {
      console.error("Error counting products:", err);
      return;
    }
    if (row.count === 0) {
      console.log("Seeding initial products...");
      const stmt = db.prepare(`
        INSERT INTO products (name, description, price, image, category, stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const products = [
        [
          "قهوة مختصة V60",
          "قهوة عربية مختصة محمصة طازجة مناسبة لطريقة تحضير V60.",
          12.5,
          "images/coffee.jpg",
          "مشروبات / Coffee",
          50
        ],
        [
          "سماعات بلوتوث لاسلكية",
          "سماعات أذن لاسلكية بجودة صوت عالية وعزل ضوضاء.",
          35.99,
          "images/earbuds.jpg",
          "إلكترونيات / Electronics",
          100
        ],
        [
          "كتاب أساسيات علم التشريح",
          "كتاب مبسط لطلاب الطب يشرح أساسيات علم التشريح مع صور توضيحية.",
          22.0,
          "images/anatomy-book.jpg",
          "كتب / Books",
          30
        ],
        [
          "كيبورد ميكانيكي للألعاب",
          "كيبورد ميكانيكي بإضاءة RGB مناسب للألعاب والعمل.",
          49.99,
          "images/keyboard.jpg",
          "إلكترونيات / Electronics",
          20
        ],
        [
          "دفتر ملاحظات منظم",
          "دفتر ملاحظات بتقسيمات أسبوعية وخطط دراسية.",
          7.5,
          "images/notebook.jpg",
          "قرطاسية / Stationery",
          80
        ]
      ];

      products.forEach(p => stmt.run(p));
      stmt.finalize();
    }
  });
});

// === API routes ===

// Get all products
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error("Error getting products:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error getting product:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(row);
  });
});

// Simple admin: add product
app.post('/api/admin/products', (req, res) => {
  const { name, description, price, image, category, stock } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }
  db.run(
    `INSERT INTO products (name, description, price, image, category, stock)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || "", price, image || "", category || "", stock || 0],
    function (err) {
      if (err) {
        console.error("Error inserting product:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Fallback: send index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
