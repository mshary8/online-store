const express = require("express");
const cors = require("cors");
const path = require("path");

// === LOWDB Setup ===
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// === Server Setup ===
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === Initialize database ===
async function initDB() {
  await db.read();
  db.data ||= { products: [] };
  await db.write();
}
initDB();

// === API ===
app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});