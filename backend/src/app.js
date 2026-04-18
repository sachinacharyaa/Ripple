import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { verifySolTransfer } from "./verifyTransfer.js";

const connection = new Connection(process.env.SOLANA_RPC || "https://api.devnet.solana.com", "confirmed");
const RIPPLE_FEE_WALLET = process.env.RIPPLE_FEE_WALLET || "G6DKYcQnySUk1ZYYuR1HMovVscWjAtyDQb6GhqrvJYnw";

let mongoConnectPromise = null;

export async function ensureDbConnected() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  if (mongoose.connection.readyState === 1) return;
  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(uri).catch((err) => {
      mongoConnectPromise = null;
      throw err;
    });
  }
  await mongoConnectPromise;
}

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

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);

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

const updateProductSchema = z
  .object({
    title: z.string().min(2).optional(),
    description: z.string().min(5).optional(),
    summary: z.string().max(2000).optional(),
    priceSol: z.number().min(0).optional(),
    priceUsdc: z.number().min(0).optional(),
    currency: z.enum(["SOL", "USDC"]).optional(),
    contentUrl: z.string().url().optional(),
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
      if (c === "USDC") return (d.priceUsdc ?? 0) > 0;
      return (d.priceSol ?? 0) > 0;
    },
    { message: "Price must be positive for the selected currency" },
  );

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCorsOrigins();

function corsOptions(origin, callback) {
  if (!origin) return callback(null, true);
  if (!allowedOrigins.length) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("CORS blocked for this origin"));
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: corsOptions }));
  app.use(express.json({ limit: "15mb" }));

  app.use(async (_req, _res, next) => {
    try {
      await ensureDbConnected();
      next();
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/products", async (_req, res) => {
    try {
      res.json(await Product.find({ status: "published" }).sort({ createdAt: -1 }));
    } catch {
      res.status(500).json({ message: "Failed to list products" });
    }
  });

  app.get("/api/products/creator/:wallet", async (req, res) => {
    try {
      res.json(await Product.find({ creatorWallet: req.params.wallet }).sort({ createdAt: -1 }));
    } catch {
      res.status(500).json({ message: "Failed to load creator products" });
    }
  });

  app.get("/api/creators/:wallet/payout", async (req, res) => {
    try {
      const { wallet } = req.params;
      const product = await Product.findOne({ creatorWallet: wallet }).sort({ createdAt: -1 });
      const payoutWallet = product?.payoutWallet || wallet;
      res.json({ payoutWallet });
    } catch {
      res.status(500).json({ message: "Failed to load payout settings" });
    }
  });

  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const p = await Product.findOne({ slug: req.params.slug, status: "published" });
      if (!p) return res.status(404).json({ message: "Not found" });
      return res.json(p);
    } catch {
      return res.status(400).json({ message: "Invalid slug" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const p = await Product.findOne({ _id: req.params.id, status: "published" });
      if (!p) return res.status(404).json({ message: "Not found" });
      return res.json(p);
    } catch {
      return res.status(400).json({ message: "Invalid product id" });
    }
  });

  app.get("/api/products/:id/owner/:wallet", async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Not found" });
      if (product.creatorWallet !== req.params.wallet) {
        return res.status(403).json({ message: "Forbidden" });
      }
      return res.json(product);
    } catch {
      return res.status(400).json({ message: "Invalid product id" });
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
      return res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.post("/api/products/:id/publish", async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Not found" });
      if (!product.slug) product.slug = await createUniqueSlug(product.title);
      product.status = "published";
      await product.save();
      return res.json(product);
    } catch {
      return res.status(400).json({ message: "Invalid product id" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Not found" });

      if (!req.body?.creatorWallet || req.body.creatorWallet !== product.creatorWallet) {
        return res.status(403).json({ message: "Only product owner can edit this product" });
      }

      const merged = {
        title: req.body.title ?? product.title,
        description: req.body.description ?? product.description,
        summary: req.body.summary ?? product.summary ?? "",
        priceSol: req.body.priceSol ?? product.priceSol,
        priceUsdc: req.body.priceUsdc ?? product.priceUsdc,
        currency: req.body.currency ?? product.currency ?? "SOL",
        contentUrl: req.body.contentUrl ?? product.contentUrl,
        coverUrl: req.body.coverUrl ?? product.coverUrl ?? "",
        thumbnailUrl: req.body.thumbnailUrl ?? product.thumbnailUrl ?? "",
        contentHash: req.body.contentHash ?? product.contentHash ?? "",
        productType: req.body.productType ?? product.productType ?? "digital",
        productInfo: req.body.productInfo ?? product.productInfo ?? "",
        status: req.body.status ?? product.status ?? "draft",
        creatorWallet: req.body.creatorWallet,
        payoutWallet:
          (req.body.payoutWallet ?? product.payoutWallet) ||
          product.creatorWallet,
      };

      const parsed = updateProductSchema.parse(merged);

      if (parsed.title !== product.title) {
        product.slug = await createUniqueSlug(parsed.title);
      }

      product.title = parsed.title;
      product.description = parsed.description;
      product.summary = parsed.summary ?? "";
      product.priceSol = parsed.priceSol ?? 0;
      product.priceUsdc = parsed.priceUsdc ?? 0;
      product.currency = parsed.currency ?? "SOL";
      product.contentUrl = parsed.contentUrl ?? product.contentUrl;
      product.coverUrl = parsed.coverUrl ?? "";
      product.thumbnailUrl = parsed.thumbnailUrl ?? parsed.coverUrl ?? "";
      product.contentHash = parsed.contentHash ?? "";
      product.productType = parsed.productType ?? "digital";
      product.productInfo = parsed.productInfo ?? "";
      product.status = parsed.status ?? product.status;
      product.payoutWallet =
        parsed.payoutWallet ||
        product.payoutWallet ||
        product.creatorWallet;

      await product.save();
      return res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid payload", issues: e.issues });
      return res.status(500).json({ message: "Failed to update product" });
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

    // Convert SOL -> lamports deterministically (client uses the same 9-decimal approach).
    const solFixed = product.priceSol.toFixed(9);
    const [wholePart, fracPart = ""] = solFixed.split(".");
    const expectedLamports = BigInt(wholePart) * BigInt(LAMPORTS_PER_SOL) + BigInt(fracPart.padEnd(9, "0").slice(0, 9));
    const feeLamports = expectedLamports / 100n; // 1% platform fee
    const creatorLamports = expectedLamports - feeLamports;
    const payoutWallet = product.payoutWallet || product.creatorWallet;

    const existing = await Purchase.findOne({ txSignature });
    if (existing) {
      if (existing.buyerWallet !== buyerWallet) return res.status(400).json({ message: "Signature already used" });
      if (existing.productId.toString() !== String(productId)) {
        return res.status(400).json({ message: "Signature already used for another product" });
      }
      return res.json({ ok: true, idempotent: true });
    }

    const check = await verifySolTransfer(
      connection,
      txSignature,
      buyerWallet,
      payoutWallet,
      RIPPLE_FEE_WALLET,
      creatorLamports.toString(),
      feeLamports.toString(),
    );
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
    return res.json({ ok: true });
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
    } catch {
      res.status(500).json({ message: "Failed to load purchases" });
    }
  });

  app.get("/api/purchases/creator/:wallet", async (req, res) => {
    try {
      const products = await Product.find({ creatorWallet: req.params.wallet });
      const ids = products.map((p) => p._id);
      const items = await Purchase.find({ productId: { $in: ids } }).populate("productId").sort({ createdAt: -1 });
      res.json(items);
    } catch {
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
      return res.json({ ok: true, updated: result?.modifiedCount ?? 0 });
    } catch {
      return res.status(500).json({ message: "Failed to update payout wallet" });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use((err, _req, res, _next) => {
    if (err?.message === "CORS blocked for this origin") {
      return res.status(403).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
