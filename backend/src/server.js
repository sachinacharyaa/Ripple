import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Connection } from "@solana/web3.js";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(process.env.SOLANA_RPC || "https://api.devnet.solana.com", "confirmed");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    priceSol: { type: Number, required: true },
    contentUrl: { type: String, required: true },
    creatorWallet: { type: String, required: true, index: true },
    salesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const purchaseSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyerWallet: { type: String, required: true, index: true },
    txSignature: { type: String, required: true, unique: true },
    amountSol: { type: Number, required: true },
    status: { type: String, default: "confirmed" },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
const Purchase = mongoose.model("Purchase", purchaseSchema);

const createProductSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  priceSol: z.number().positive(),
  contentUrl: z.string().url(),
  creatorWallet: z.string().min(32),
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/products", async (_req, res) => res.json(await Product.find().sort({ createdAt: -1 })));
app.get("/api/products/:id", async (req, res) => res.json(await Product.findById(req.params.id)));
app.get("/api/products/creator/:wallet", async (req, res) => res.json(await Product.find({ creatorWallet: req.params.wallet }).sort({ createdAt: -1 })));
app.post("/api/products", async (req, res) => {
  const parsed = createProductSchema.parse(req.body);
  const product = await Product.create(parsed);
  res.status(201).json(product);
});

app.post("/api/purchases/verify", async (req, res) => {
  const { productId, buyerWallet, txSignature } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const tx = await connection.getTransaction(txSignature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx) return res.status(400).json({ message: "Transaction not found" });

  await Purchase.create({ productId, buyerWallet, txSignature, amountSol: product.priceSol, status: "confirmed" });
  product.salesCount += 1;
  await product.save();
  res.json({ ok: true });
});

app.post("/api/access/unlock", async (req, res) => {
  const { productId, buyerWallet } = req.body;
  const record = await Purchase.findOne({ productId, buyerWallet, status: "confirmed" });
  if (!record) return res.status(403).json({ message: "No access" });
  const product = await Product.findById(productId);
  return res.json({ contentUrl: product?.contentUrl || "" });
});

app.get("/api/purchases/wallet/:wallet", async (req, res) => {
  const items = await Purchase.find({ buyerWallet: req.params.wallet }).populate("productId").sort({ createdAt: -1 });
  res.json(items);
});

const port = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
mongoose.connect(uri).then(() => {
  app.listen(port, () => console.log(`Ripple API running on :${port}`));
});
