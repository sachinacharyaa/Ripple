import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { verifySolTransfer } from "./verifyTransfer.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const connection = new Connection(process.env.SOLANA_RPC || "https://api.devnet.solana.com", "confirmed");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, index: true },
    description: { type: String, required: true },
    summary: { type: String, default: "" },
    priceSol: { type: Number, default: 0 },
    priceUsdc: { type: Number, default: 0 },
    currency: { type: String, enum: ["SOL", "USDC"], default: "SOL" },
    contentUrl: { type: String, required: true },
    coverUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    contentHash: { type: String, default: "" },
    productType: { type: String, default: "digital" },
    productInfo: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    creatorWallet: { type: String, required: true, index: true },
    payoutWallet: { type: String, default: "" },
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

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const createUniqueSlug = async (title) => {
  const base = slugify(title) || "product";
  let slug = base;
  let counter = 1;
  while (await Product.exists({ slug })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
};

const createProductSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(5),
    summary: z.string().max(2000).optional(),
    priceSol: z.number().min(0),
    priceUsdc: z.number().min(0),
    currency: z.enum(["SOL", "USDC"]).optional(),
    contentUrl: z.string().url(),
    coverUrl: z.string().max(12_000_000).optional(),
    thumbnailUrl: z.string().max(12_000_000).optional(),
    contentHash: z.string().max(128).optional(),
    productType: z.string().max(64).optional(),
    productInfo: z.string().max(4000).optional(),
    status: z.enum(["draft", "published"]).optional(),
    creatorWallet: z.string().min(32),
    payoutWallet: z.string().min(32).optional(),
  })
  .refine(
    (d) => {
      const c = d.currency ?? "SOL";
      if (c === "USDC") return d.priceUsdc > 0;
      return d.priceSol > 0;
    },
    { message: "Price must be positive for the selected currency" },
  );

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await Product.find({ status: "published" }).sort({ createdAt: -1 }));
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

app.get("/api/creators/:wallet/payout", async (req, res) => {
  try {
    const { wallet } = req.params;
    const product = await Product.findOne({ creatorWallet: wallet }).sort({ createdAt: -1 });
    const payoutWallet = product?.payoutWallet || wallet;
    res.json({ payoutWallet });
  } catch (e) {
    res.status(500).json({ message: "Failed to load payout settings" });
  }
});

app.get("/api/products/slug/:slug", async (req, res) => {
  try {
    const p = await Product.findOne({ slug: req.params.slug, status: "published" });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) {
    res.status(400).json({ message: "Invalid slug" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, status: "published" });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) {
    res.status(400).json({ message: "Invalid product id" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const parsed = createProductSchema.parse(req.body);
    const slug = await createUniqueSlug(parsed.title);
    const product = await Product.create({
      ...parsed,
      slug,
      currency: parsed.currency ?? "SOL",
      contentHash: parsed.contentHash ?? "",
      summary: parsed.summary ?? "",
      coverUrl: parsed.coverUrl ?? "",
      thumbnailUrl: parsed.thumbnailUrl ?? "",
      productType: parsed.productType ?? "digital",
      productInfo: parsed.productInfo ?? "",
      status: parsed.status ?? "draft",
      payoutWallet: parsed.payoutWallet ?? parsed.creatorWallet,
    });
    res.status(201).json(product);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: e.issues });
    res.status(500).json({ message: "Failed to create product" });
  }
});

app.post("/api/products/:id/publish", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    if (!product.slug) product.slug = await createUniqueSlug(product.title);
    product.status = "published";
    await product.save();
    res.json(product);
  } catch (e) {
    res.status(400).json({ message: "Invalid product id" });
  }
});

app.post("/api/purchases/verify", async (req, res) => {
  const { productId, buyerWallet, txSignature } = req.body;
  if (!productId || !buyerWallet || !txSignature) {
    return res.status(400).json({ message: "productId, buyerWallet, and txSignature are required" });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.currency === "USDC") {
    return res.status(400).json({ message: "USDC checkout is not enabled yet — list in USDC but buyers pay in SOL once you switch currency to SOL." });
  }
  if (product.priceSol <= 0) {
    return res.status(400).json({ message: "This product has no SOL price" });
  }

  const expectedLamports = Math.round(product.priceSol * LAMPORTS_PER_SOL);
  const payoutWallet = product.payoutWallet || product.creatorWallet;

  const existing = await Purchase.findOne({ txSignature });
  if (existing) {
    if (existing.buyerWallet !== buyerWallet) return res.status(400).json({ message: "Signature already used" });
    if (existing.productId.toString() !== String(productId)) {
      return res.status(400).json({ message: "Signature already used for another product" });
    }
    return res.json({ ok: true, idempotent: true });
  }

  const check = await verifySolTransfer(connection, txSignature, buyerWallet, payoutWallet, expectedLamports);
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

app.post("/api/creators/:wallet/payout", async (req, res) => {
  const { wallet } = req.params;
  const { payoutWallet } = req.body ?? {};
  if (!payoutWallet || typeof payoutWallet !== "string" || payoutWallet.length < 32) {
    return res.status(400).json({ message: "payoutWallet is required" });
  }
  try {
    const result = await Product.updateMany({ creatorWallet: wallet }, { payoutWallet });
    res.json({ ok: true, updated: result?.modifiedCount ?? 0 });
  } catch (e) {
    res.status(500).json({ message: "Failed to update payout wallet" });
  }
});

const port = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
mongoose.connect(uri).then(() => {
  app.listen(port, () => console.log(`Ripple API running on :${port}`));
});
