import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api" });

function explorerTxUrl(signature: string) {
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER || "devnet";
  if (cluster === "mainnet-beta") return `https://explorer.solana.com/tx/${signature}`;
  return `https://explorer.solana.com/tx/${signature}?cluster=${encodeURIComponent(cluster)}`;
}

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

function formatSol(value: number) {
  return `${value.toFixed(2)} SOL`;
}

function shorten(address: string) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function Coins() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const coins = document.querySelectorAll<HTMLElement>(".coin");
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      coins.forEach((coin, i) => {
        const factor = (i + 1) * 6;
        const rx = dy * factor;
        const ry = -dx * factor;
        coin.style.setProperty("--parallax-x", `${dx * factor}px`);
        coin.style.setProperty("--parallax-y", `${dy * factor}px`);
        coin.style.setProperty("--parallax-rx", `${rx}deg`);
        coin.style.setProperty("--parallax-ry", `${ry}deg`);
      });
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, []);

  return (
    <>
      <div className="coin coin--1" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--2" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--3" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--4" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--5" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--6" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
      <div className="coin coin--7" aria-hidden="true">
        <div className="coin__face">R</div>
      </div>
    </>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="page">
      <Coins />
      <header className="site-header" id="top">
        <div className="header-left">
          <Link to="/" className="logo">
            Ripple
          </Link>
          <span className="badge">Solana native</span>
        </div>
        <nav className="nav-links">
          {isHome ? (
            <>
              <a href="/#discover">Discover</a>
              <a href="/#features">Features</a>
              <a href="/#creators">Creators</a>
              <a href="/#marketplace" className="nav-link--outlined">
                Marketplace
              </a>
            </>
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/history">History</Link>
            </>
          )}
        </nav>
        <div className="header-right header-right--wallet">
          <Link to="/dashboard" className="dashboard-button">
            Dashboard
          </Link>
          <WalletMultiButton className="wallet-multi-btn" />
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        Built for creators on Solana. Learn more on{" "}
        <a href="https://github.com/sachinacharyaa/Ripple" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </footer>
    </div>
  );
}

function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch(() => setError("Unable to load marketplace products."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return products;
    return products.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(lower));
  }, [products, query]);

  return (
    <Layout>
      <section className="hero" id="discover">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero-tag">
          Decentralized creator monetization
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-title">
          Go from 0 to 1$OL
        </motion.h1>
        <p className="hero-sub">
          Ripple lets anyone sell digital content, accept instant crypto payments, and unlock access with a wallet.
        </p>
        <div className="hero-actions">
          <Link to="/dashboard#create" className="btn btn-primary">
            Start selling
          </Link>
          <a href="/#marketplace" className="btn btn-secondary">
            Explore marketplace
          </a>
        </div>
        <div className="search-bar" aria-label="Search marketplace">
          <input
            type="text"
            placeholder="Search marketplace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">Instant</div>
            <div className="stat-label">Crypto payouts in SOL</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">Wallet-only</div>
            <div className="stat-label">Access control, not email</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">Global</div>
            <div className="stat-label">No Stripe or PayPal limits</div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head">
          <div>
            <div className="section-kicker">Vision</div>
            <h2 className="section-title">A creator-first Solana marketplace</h2>
            <p className="section-sub">
              Ripple removes platform lock-in so creators can sell anything, anywhere, and get paid instantly with crypto.
            </p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="card-title">The problem</div>
            <p className="card-meta">Legacy platforms charge high fees, require Stripe/PayPal, and can ban creators.</p>
          </div>
          <div className="card">
            <div className="card-title">The solution</div>
            <p className="card-meta">Sell digital content, set a SOL price, and unlock access immediately with on-chain verification.</p>
          </div>
          <div className="card">
            <div className="card-title">The impact</div>
            <p className="card-meta">Creators keep control, earn globally, and gate access using wallets instead of emails.</p>
          </div>
        </div>
      </section>

      <section className="section" id="creators">
        <div className="section-head">
          <div>
            <div className="section-kicker">Target users</div>
            <h2 className="section-title">Built for modern creators</h2>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="card-title">Primary</div>
            <p className="card-meta">Indie creators, students, devs, designers, freelancers, and AI/tech educators.</p>
          </div>
          <div className="card">
            <div className="card-title">Secondary</div>
            <p className="card-meta">Buyers looking for templates, courses, notes, and creator tools.</p>
          </div>
          <div className="card">
            <div className="card-title">Global</div>
            <p className="card-meta">Anyone blocked by legacy payment rails can earn with Solana.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-kicker">Core features</div>
            <h2 className="section-title">Everything you need to sell on-chain</h2>
            <p className="section-sub">SOL payments now, USDC support coming next.</p>
          </div>
        </div>
        <div className="grid grid-3">
          {[
            "Wallet authentication with Phantom",
            "Creator dashboard for products and earnings",
            "Public product page with Buy Now flow",
            "On-chain payment verification",
            "Instant access unlock after purchase",
            "Transaction history for buyers",
          ].map((item) => (
            <div className="card" key={item}>
              <div className="card-title">{item}</div>
              <p className="card-meta">Powered by Solana for fast settlement.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-head">
          <div>
            <div className="section-kicker">User flow</div>
            <h2 className="section-title">From listing to unlock in minutes</h2>
          </div>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title">Creator flow</div>
            <div className="flow-column">
              {[
                "Connect your wallet",
                "Create a product with title, price, and content link",
                "Publish and share your product page",
                "Track sales and earnings in the dashboard",
              ].map((step, index) => (
                <div className="flow-step" key={step}>
                  <div className="flow-step-number">{index + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Buyer flow</div>
            <div className="flow-column">
              {[
                "Open the product page",
                "Connect wallet and click Buy",
                "Approve the Solana transfer",
                "Instantly unlock the gated link",
              ].map((step, index) => (
                <div className="flow-step" key={step}>
                  <div className="flow-step-number">{index + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="marketplace">
        <div className="section-head">
          <div>
            <div className="section-kicker">Marketplace</div>
            <h2 className="section-title">Discover products on Ripple</h2>
            <p className="section-sub">Real listings from creators using the Ripple workflow.</p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="marketplace-grid">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div className="card product-card skeleton-card" key={k} aria-hidden>
                <div className="skeleton-line skeleton-line--tag" />
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">No products yet. Be the first to publish.</div>
        ) : (
          <div className="marketplace-grid">
            {filtered.map((product) => (
              <Link to={`/p/${product._id}`} key={product._id} className="card product-card">
                <div className="tag">Creator</div>
                <div className="card-title">{product.title}</div>
                <p className="card-meta">{product.description}</p>
                <div className="product-price">{formatSol(product.priceSol)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

function Dashboard() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priceSol: "0.1", contentUrl: "" });

  const earnings = useMemo(
    () => products.reduce((sum, p) => sum + p.priceSol * p.salesCount, 0),
    [products],
  );

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    api
      .get(`/products/creator/${wallet}`)
      .then((res) => setProducts(res.data))
      .catch(() => setError("Unable to load your products."))
      .finally(() => setLoading(false));
  }, [wallet]);

  useEffect(() => {
    if (location.hash !== "#create") return;
    const target = document.getElementById("create-product");
    target?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!wallet) return;
    setSubmitting(true);
    setNotice("");
    setError("");
    try {
      await api.post("/products", { ...form, priceSol: Number(form.priceSol), creatorWallet: wallet });
      setNotice("Product published! Share your new link below.");
      setForm({ title: "", description: "", priceSol: "0.1", contentUrl: "" });
      const refreshed = await api.get(`/products/creator/${wallet}`);
      setProducts(refreshed.data);
    } catch {
      setError("Failed to publish product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="page-section">
        <div className="section-head">
          <div>
            <div className="section-kicker">Creator dashboard</div>
            <h2 className="section-title">Manage products and earnings</h2>
            <p className="section-sub">Connect your wallet to create products, track sales, and share links.</p>
          </div>
        </div>

        {!wallet ? (
          <div className="card">
            <div className="card-title">Connect your wallet</div>
            <p className="card-meta">Use Phantom (or another supported wallet) via the wallet adapter.</p>
            <div style={{ marginTop: "12px" }}>
              <WalletMultiButton className="wallet-multi-btn" />
            </div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{formatSol(earnings)}</div>
                <div className="stat-label">Total earnings</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{products.reduce((sum, p) => sum + p.salesCount, 0)}</div>
                <div className="stat-label">Sales count</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{products.length}</div>
                <div className="stat-label">Active products</div>
              </div>
            </div>

            <div className="divider"></div>

            <form id="create-product" className="card form-card" onSubmit={submit}>
              <div className="card-title">Create a product</div>
              <div className="field">
                <label htmlFor="title">Title</label>
                <input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="price">Price (SOL)</label>
                <input id="price" type="number" step="0.01" value={form.priceSol} onChange={(e) => setForm({ ...form, priceSol: e.target.value })} required />
                <span className="helper">Tip: micro-payments work great for notes and templates.</span>
              </div>
              <div className="field">
                <label htmlFor="content">Content link</label>
                <input id="content" value={form.contentUrl} onChange={(e) => setForm({ ...form, contentUrl: e.target.value })} required />
              </div>
              {notice && <div className="notice">{notice}</div>}
              {error && <div className="error">{error}</div>}
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish product"}
              </button>
            </form>

            <div className="divider"></div>

            <div className="section-title-small">Your products</div>
            {loading ? (
              <div className="empty">Loading your products...</div>
            ) : products.length === 0 ? (
              <div className="empty">No products yet. Create your first listing above.</div>
            ) : (
              <div className="marketplace-grid">
                {products.map((product) => (
                  <div className="card" key={product._id}>
                    <div className="card-title">{product.title}</div>
                    <p className="card-meta">{product.description}</p>
                    <p className="product-price">{formatSol(product.priceSol)}</p>
                    <p className="card-meta">Sales: {product.salesCount}</p>
                    <Link className="btn btn-outline" to={`/p/${product._id}`}>
                      Open product page
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [contentLink, setContentLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
  }, [id]);

  useEffect(() => {
    if (!product || !wallet) return;
    api
      .post("/access/unlock", { productId: product._id, buyerWallet: wallet })
      .then((res) => setContentLink(res.data.contentUrl))
      .catch(() => undefined);
  }, [product, wallet]);

  const buy = async () => {
    if (!product) return;
    setError("");
    setStatus("");

    if (!publicKey) {
      setError("Connect your wallet first (header or wallet button).");
      return;
    }

    setBusy(true);
    try {
      const buyerWallet = publicKey.toBase58();
      setStatus("Preparing transaction...");
      const toPubkey = new PublicKey(product.creatorWallet);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports: Math.round(product.priceSol * LAMPORTS_PER_SOL),
        }),
      );
      const latest = await connection.getLatestBlockhash();
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;
      setStatus("Awaiting wallet approval...");
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");

      setStatus("Verifying on-chain payment...");
      await api.post("/purchases/verify", { productId: product._id, buyerWallet, txSignature: signature });

      setStatus("Unlocking content...");
      const access = await api.post("/access/unlock", { productId: product._id, buyerWallet });
      setContentLink(access.data.contentUrl);
      setStatus("Unlocked! Enjoy your content.");
    } catch {
      setError("Payment failed. Ensure you are on the same network as the app (devnet by default) and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!product) {
    return (
      <Layout>
        <section className="page-section">
          <div className="empty">Loading product...</div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-section">
        <div className="card">
          <div className="tag">Creator product</div>
          <h2 className="section-title" style={{ marginTop: "8px" }}>{product.title}</h2>
          <p className="section-sub">{product.description}</p>
          <p className="product-price">{formatSol(product.priceSol)}</p>
          <p className="card-meta">Creator: {shorten(product.creatorWallet)}</p>
          {status && <div className="notice" style={{ marginTop: "12px" }}>{status}</div>}
          {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy} onClick={buy}>
              {busy ? "Processing..." : "Buy now"}
            </button>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
          </div>
          {contentLink && (
            <div style={{ marginTop: "16px" }}>
              <div className="tag">Access unlocked</div>
              <p className="card-meta">Your content link is ready.</p>
              <a className="btn btn-secondary" href={contentLink} target="_blank" rel="noreferrer">
                Open content
              </a>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function History() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [tab, setTab] = useState<"buyer" | "creator">("buyer");
  const [buyerItems, setBuyerItems] = useState<Purchase[]>([]);
  const [creatorItems, setCreatorItems] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setBuyerItems([]);
      setCreatorItems([]);
      return;
    }
    setLoading(true);
    const buyerReq = api.get(`/purchases/wallet/${wallet}`).then((r) => setBuyerItems(r.data));
    const creatorReq = api.get(`/purchases/creator/${wallet}`).then((r) => setCreatorItems(r.data));
    Promise.all([buyerReq, creatorReq]).finally(() => setLoading(false));
  }, [wallet]);

  const items = tab === "buyer" ? buyerItems : creatorItems;

  return (
    <Layout>
      <section className="page-section">
        <div className="section-head">
          <div>
            <div className="section-kicker">Transaction history</div>
            <h2 className="section-title">Purchases &amp; earnings</h2>
            <p className="section-sub">Buyer purchases and sales on your products.</p>
          </div>
        </div>

        {!wallet ? (
          <div className="card">
            <div className="card-title">Connect to view history</div>
            <p className="card-meta">Connect your wallet to see purchases and creator earnings.</p>
            <div style={{ marginTop: "12px" }}>
              <WalletMultiButton className="wallet-multi-btn" />
            </div>
          </div>
        ) : (
          <>
            <div className="history-tabs">
              <button type="button" className={tab === "buyer" ? "tab tab--active" : "tab"} onClick={() => setTab("buyer")}>
                My purchases
              </button>
              <button type="button" className={tab === "creator" ? "tab tab--active" : "tab"} onClick={() => setTab("creator")}>
                Creator earnings
              </button>
            </div>
            {loading ? (
              <div className="marketplace-grid">
                {[1, 2, 3].map((k) => (
                  <div className="card skeleton-card" key={k} aria-hidden>
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="empty">
                {tab === "buyer" ? "No purchases yet. Explore the marketplace to buy content." : "No sales yet. Publish a product from the dashboard."}
              </div>
            ) : (
              <div className="marketplace-grid">
                {items.map((item) => (
                  <div className="card" key={item._id}>
                    <div className="card-title">{item.productId?.title || "Product"}</div>
                    <p className="card-meta">{item.productId?.description}</p>
                    <p className="product-price">{formatSol(item.amountSol)}</p>
                    {tab === "creator" ? (
                      <p className="card-meta">Buyer: {shorten(item.buyerWallet)}</p>
                    ) : null}
                    <a className="btn btn-outline" href={explorerTxUrl(item.txSignature)} target="_blank" rel="noreferrer">
                      View transaction
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
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
