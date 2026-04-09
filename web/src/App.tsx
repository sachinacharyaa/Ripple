import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { motion } from "framer-motion";

type Product = {
  _id: string;
  title: string;
  description: string;
  priceSol: number;
  contentUrl: string;
  creatorWallet: string;
  salesCount: number;
};

type Purchase = {
  _id: string;
  productId: Product;
  buyerWallet: string;
  txSignature: string;
  amountSol: number;
  status: string;
};

type PhantomWindow = Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: PublicKey }>; signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> } };
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api" });

function useWallet() {
  const [wallet, setWallet] = useState("");
  const connect = async () => {
    const provider = (window as PhantomWindow).solana;
    if (!provider?.isPhantom) throw new Error("Phantom not found");
    const response = await provider.connect();
    setWallet(response.publicKey.toBase58());
  };
  return { wallet, connect };
}

function Layout({ children }: { children: JSX.Element }) {
  return (
    <div className="page">
      <header className="site-header">
        <Link to="/" className="logo">Ripple</Link>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/history">History</Link>
        </nav>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => { api.get("/products").then((r) => setProducts(r.data)); }, []);
  return (
    <Layout>
      <div>
        <h1 className="hero-title">Go from 0 to 1$OL</h1>
        <p className="hero-sub">Discover creator products on Solana.</p>
        <div className="grid">
          {products.map((p) => (
            <Link to={`/p/${p._id}`} key={p._id} className="card">
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <strong>{p.priceSol} SOL</strong>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function Dashboard() {
  const { wallet, connect } = useWallet();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ title: "", description: "", priceSol: "0.1", contentUrl: "" });
  const earnings = useMemo(() => products.reduce((sum, p) => sum + p.priceSol * p.salesCount, 0), [products]);
  useEffect(() => { if (wallet) api.get(`/products/creator/${wallet}`).then((r) => setProducts(r.data)); }, [wallet]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    await api.post("/products", { ...form, priceSol: Number(form.priceSol), creatorWallet: wallet });
    const refreshed = await api.get(`/products/creator/${wallet}`);
    setProducts(refreshed.data);
    setForm({ title: "", description: "", priceSol: "0.1", contentUrl: "" });
  };

  return (
    <Layout>
      <div>
        <h2>Creator Dashboard</h2>
        {!wallet ? <button className="btn" onClick={connect}>Connect Phantom</button> : <p>Wallet: {wallet}</p>}
        <div className="stats"><div className="card"><h3>Earnings</h3><p>{earnings.toFixed(2)} SOL</p></div><div className="card"><h3>Sales</h3><p>{products.reduce((a, b) => a + b.salesCount, 0)}</p></div></div>
        <form className="card form" onSubmit={submit}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input placeholder="Price (SOL)" type="number" step="0.01" value={form.priceSol} onChange={(e) => setForm({ ...form, priceSol: e.target.value })} required />
          <input placeholder="IPFS / Drive Link" value={form.contentUrl} onChange={(e) => setForm({ ...form, contentUrl: e.target.value })} required />
          <button className="btn">Publish Product</button>
        </form>
      </div>
    </Layout>
  );
}

function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { wallet, connect } = useWallet();
  const [product, setProduct] = useState<Product | null>(null);
  const [contentLink, setContentLink] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/products/${id}`).then((r) => setProduct(r.data)); }, [id]);

  const buy = async () => {
    if (!product) return;
    const provider = (window as PhantomWindow).solana;
    if (!wallet) await connect();
    if (!provider?.isPhantom) throw new Error("Phantom not found");

    setBusy(true);
    try {
      const fromPubkey = new PublicKey(wallet || (await provider.connect()).publicKey.toBase58());
      const toPubkey = new PublicKey(product.creatorWallet);
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com", "confirmed");
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports: Math.round(product.priceSol * LAMPORTS_PER_SOL) }));
      tx.feePayer = fromPubkey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signed = await provider.signAndSendTransaction(tx);
      await api.post("/purchases/verify", { productId: product._id, buyerWallet: fromPubkey.toBase58(), txSignature: signed.signature });
      const access = await api.post("/access/unlock", { productId: product._id, buyerWallet: fromPubkey.toBase58() });
      setContentLink(access.data.contentUrl);
    } finally {
      setBusy(false);
    }
  };

  if (!product) return <Layout><div>Loading...</div></Layout>;
  return (
    <Layout>
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <p><strong>{product.priceSol} SOL</strong></p>
        <button className="btn" disabled={busy} onClick={buy}>{busy ? "Processing..." : "Buy now"}</button>
        {contentLink && <p className="unlock">Unlocked: <a href={contentLink} target="_blank" rel="noreferrer">Open content</a></p>}
        <button className="ghost" onClick={() => nav("/")}>Back</button>
      </motion.div>
    </Layout>
  );
}

function History() {
  const { wallet, connect } = useWallet();
  const [items, setItems] = useState<Purchase[]>([]);
  useEffect(() => { if (wallet) api.get(`/purchases/wallet/${wallet}`).then((r) => setItems(r.data)); }, [wallet]);
  return (
    <Layout>
      <div>
        <h2>Transaction History</h2>
        {!wallet ? <button className="btn" onClick={connect}>Connect Wallet</button> : null}
        <div className="grid">
          {items.map((item) => (
            <div className="card" key={item._id}>
              <h3>{item.productId?.title || "Product"}</h3>
              <p>{item.amountSol} SOL</p>
              <a href={`https://explorer.solana.com/tx/${item.txSignature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction</a>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/p/:id" element={<ProductPage />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
}
