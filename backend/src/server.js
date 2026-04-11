import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { verifySolTransfer } from "./verifyTransfer.js";

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(process.env.SOLANA_RPC || "https://api.devnet.solana.com", "confirmed");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    priceSol: { type: Number, required: true },
    /** SOL (default) or USDC — USDC path not wired in MVP UI */
    currency: { type: String, enum: ["SOL", "USDC"], default: "SOL" },
    contentUrl: { type: String, required: true },
    /** Optional keccak/sha256 of content URL for on-chain parity */
    contentHash: { type: String, default: "" },
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
  currency: z.enum(["SOL", "USDC"]).optional(),
  contentUrl: z.string().url(),
  contentHash: z.string().max(128).optional(),
  creatorWallet: z.string().min(32),
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await Product.find().sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ message: "Failed to list products" });
  }
});

/** Must be registered before /api/products/:id so "creator" is not treated as an id */
app.get("/api/products/creator/:wallet", async (req, res) => {
  try {
    res.json(await Product.find({ creatorWallet: req.params.wallet }).sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ message: "Failed to load creator products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) {
    res.status(400).json({ message: "Invalid product id" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const parsed = createProductSchema.parse(req.body);
    const product = await Product.create({
      ...parsed,
      currency: parsed.currency ?? "SOL",
      contentHash: parsed.contentHash ?? "",
    });
    res.status(201).json(product);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: e.issues });
    res.status(500).json({ message: "Failed to create product" });
  }
});

app.post("/api/purchases/verify", async (req, res) => {
  const { productId, buyerWallet, txSignature } = req.body;
  if (!productId || !buyerWallet || !txSignature) {
    return res.status(400).json({ message: "productId, buyerWallet, and txSignature are required" });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.currency && product.currency !== "SOL") {
    return res.status(400).json({ message: "Only SOL purchases are supported in this build" });
  }

  const expectedLamports = Math.round(product.priceSol * LAMPORTS_PER_SOL);

  const existing = await Purchase.findOne({ txSignature });
  if (existing) {
    if (existing.buyerWallet !== buyerWallet) return res.status(400).json({ message: "Signature already used" });
    if (existing.productId.toString() !== String(productId)) {
      return res.status(400).json({ message: "Signature already used for another product" });
    }
    return res.json({ ok: true, idempotent: true });
  }

  const check = await verifySolTransfer(connection, txSignature, buyerWallet, product.creatorWallet, expectedLamports);
  if (!check.ok) return res.status(400).json({ message: check.reason || "Verification failed" });

  try {
    await Purchase.create({
      productId,
      buyerWallet,
      txSignature,
      amountSol: product.priceSol,
      status: "confirmed",
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(400).json({ message: "Duplicate transaction" });
    throw e;
  }

  product.salesCount += 1;
  await product.save();
  res.json({ ok: true });
});

app.post("/api/access/unlock", async (req, res) => {
  const { productId, buyerWallet } = req.body;
  if (!productId || !buyerWallet) return res.status(400).json({ message: "productId and buyerWallet required" });
  const record = await Purchase.findOne({ productId, buyerWallet, status: "confirmed" });
  if (!record) return res.status(403).json({ message: "No access" });
  const product = await Product.findById(productId);
  return res.json({ contentUrl: product?.contentUrl || "" });
});

app.get("/api/purchases/wallet/:wallet", async (req, res) => {
  try {
    const items = await Purchase.find({ buyerWallet: req.params.wallet }).populate("productId").sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Failed to load purchases" });
  }
});

/** Sales received by creator (buyer purchases of this creator's products) */
app.get("/api/purchases/creator/:wallet", async (req, res) => {
  try {
    const products = await Product.find({ creatorWallet: req.params.wallet });
    const ids = products.map((p) => p._id);
    const items = await Purchase.find({ productId: { $in: ids } }).populate("productId").sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Failed to load creator sales" });
  }
});

const port = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
mongoose.connect(uri).then(() => {
  app.listen(port, () => console.log(`Ripple API running on :${port}`));
});
