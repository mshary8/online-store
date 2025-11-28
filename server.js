// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup (بدل sqlite3) ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

// ملف قاعدة البيانات البسيطة
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);

// بيانات افتراضية (مطلوبة في lowdb v7)
const defaultData = { products: [] };

// نمرر الـ defaultData عشان ما يطلع خطأ "missing default data"
const db = new Low(adapter, defaultData);

// === تهيئة قاعدة البيانات ===
async function initDB() {
  await db.read();

  // نتأكد أن db.data موجود وفيه مصفوفة products
  if (!db.data || !Array.isArray(db.data.products)) {
    db.data = { products: [] };
  }

  // (اختياري) إضافة منتجات تجريبية أول مرة
  if (db.data.products.length === 0) {
    db.data.products.push(
      {
        id: 1,
        name: "Nike Shoes",
        description: "Modern running shoes",
        price: 199,
        image: "shoes.jpg",
        category: "Sport",
      },
      {
        id: 2,
        name: "Apple Watch",
        description: "Smart fitness watch",
        price: 299,
        image: "watch.jpg",
        category: "Electronics",
      }
    );
  }

  await db.write();
}

// === إعداد السيرفر ===
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // ملفات الواجهة

// === API ===
// إرجاع قائمة المنتجات
app.get("/api/products", async (req, res) => {
  try {
    await db.read();
    res.json(db.data.products);
  } catch (err) {
    console.error("Error reading products:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// (اختياري) لو تستخدم single-page app في front-end
// نخلي أي مسار يرجع index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// نشغّل السيرفر بعد ما نجهز قاعدة البيانات
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port", PORT);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize DB:", err);
    process.exit(1);
  });