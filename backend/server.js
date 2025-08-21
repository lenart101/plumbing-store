
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---- in-memory 'baza' (za demo) ----
let categories = ["Cevi", "Ventili", "Pipe", "Armature"];
let products = [
  { id: nanoid(8), category: "Cevi", name: "PVC Cev 20mm", description: "Kvalitetna cev za vodovodne inštalacije.", price: 2.99, image: "" },
];

// ---- statične datoteke za naložene slike ----
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// ---- multer (upload) ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ===================== KATEGORIJE =====================
app.get("/categories", (req, res) => res.json(categories));

app.post("/categories", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Manjka ime kategorije" });
  if (categories.includes(name)) return res.status(409).json({ error: "Kategorija že obstaja" });
  categories.push(name);
  res.status(201).json({ name });
});

app.delete("/categories/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  categories = categories.filter(c => c !== name);
  products = products.map(p => (p.category === name ? { ...p, category: "Drugo" } : p));
  if (!categories.includes("Drugo")) categories.push("Drugo");
  res.status(204).end();
});

// ===================== IZDELKI =====================
app.get("/products", (req, res) => res.json(products));

app.get("/products/:id", (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Izdelek ne obstaja" });
  res.json(p);
});

app.post("/products", (req, res) => {
  const { name, description, category, price, image } = req.body || {};
  if (!name || !description || !category || price == null) {
    return res.status(400).json({ error: "Manjkajoča polja (name, description, category, price)" });
  }
  const item = { id: nanoid(8), name, description, category, price: Number(price), image: image || "" };
  products.unshift(item);
  res.status(201).json(item);
});

app.put("/products/:id", (req, res) => {
  const idx = products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Izdelek ne obstaja" });

  const { name, description, category, price, image } = req.body || {};
  const current = products[idx];
  const updated = {
    ...current,
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(price !== undefined ? { price: Number(price) } : {}),
    ...(image !== undefined ? { image } : {}),
  };
  products[idx] = updated;
  res.json(updated);
});

app.delete("/products/:id", (req, res) => {
  const exists = products.some(x => x.id === req.params.id);
  products = products.filter(x => x.id !== req.params.id);
  if (!exists) return res.status(404).json({ error: "Izdelek ne obstaja" });
  res.status(204).end();
});

// ===================== UPLOAD SLIK =====================
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Manjka datoteka" });
  const publicBase = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  const imageUrl = `${publicBase}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ===================== START =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API teče na http://localhost:${PORT}`);
});
