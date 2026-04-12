import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { api } from "./lib/api";
import { formatProductPrice, productPublicPath } from "./lib/productUtils";
import { FormatProductDescription } from "./lib/richDescription";
import type { ProductShape } from "./types/product";
import { DashboardShell } from "./layouts/DashboardShell";
import { DashboardHomePage } from "./pages/dashboard/DashboardHomePage";
import { DashboardProductsPage } from "./pages/dashboard/DashboardProductsPage";
import { DashboardNewProductPage } from "./pages/dashboard/DashboardNewProductPage";

type Product = ProductShape;

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

function Layout({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "dashboard" }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className={variant === "dashboard" ? "page page--dashboard" : "page"}>
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
              <Link to="/products">Products</Link>
              <a href="/#marketplace" className="nav-link--outlined">
                Marketplace
              </a>
            </>
          ) : (
            <>
              <Link to="/">Home</Link>
              <Link to="/products">Products</Link>
              <Link to="/dashboard/home">Dashboard</Link>
            </>
          )}
        </nav>
        <div className="header-right header-right--wallet">
          <Link to="/dashboard/home" className="dashboard-button">
            Dashboard
          </Link>
          <WalletMultiButton className="wallet-multi-btn" />
        </div>
      </header>
      <main className={variant === "dashboard" ? "main main--dashboard-pro" : "main"}>{children}</main>
      <footer className={variant === "dashboard" ? "footer footer--dashboard-pro" : "footer"}>
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
        <div className="hero-coins" aria-hidden="true">
          <Coins />
        </div>
        <div className="hero-content">
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
          <Link to="/dashboard/home" className="btn btn-primary">
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
            "Activity metrics on your dashboard home",
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
              <Link to={productPublicPath(product)} key={product._id} className="card product-card">
                {product.thumbnailUrl ? (
                  <img src={product.thumbnailUrl} alt="" className="product-card__thumb" />
                ) : null}
                <div className="tag">Creator</div>
                <div className="card-title">{product.title}</div>
                <p className="card-meta">
                  {product.summary ? (
                    product.summary
                  ) : (
                    <FormatProductDescription text={product.description} />
                  )}
                </p>
                <div className="product-price">{formatProductPrice(product)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

function ProductsPage() {
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
      <section className="section" id="products">
        <div className="section-head">
          <div>
            <div className="section-kicker">Live</div>
            <h2 className="section-title">Products on Ripple</h2>
            <p className="section-sub">Only published products show up here.</p>
          </div>
          <div className="search-bar" aria-label="Search products">
            <input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
          <div className="empty">No published products yet.</div>
        ) : (
          <div className="marketplace-grid">
            {filtered.map((product) => (
              <Link to={productPublicPath(product)} key={product._id} className="card product-card">
                {product.thumbnailUrl ? (
                  <img src={product.thumbnailUrl} alt="" className="product-card__thumb" />
                ) : null}
                <div className="tag">Creator</div>
                <div className="card-title">{product.title}</div>
                <p className="card-meta">
                  {product.summary ? (
                    product.summary
                  ) : (
                    <FormatProductDescription text={product.description} />
                  )}
                </p>
                <div className="product-price">{formatProductPrice(product)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

function ProductPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id && !slug) return;
    const path = slug ? `/products/slug/${slug}` : `/products/${id}`;
    setLoadError("");
    setProduct(null);
    api
      .get(path)
      .then((res) => setProduct(res.data))
      .catch(() => setLoadError("Product not found."));
  }, [id, slug]);

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

    if (product.currency === "USDC") {
      setError("This listing is priced in USDC. On-chain checkout for USDC is not enabled yet — ask the creator for a SOL-priced version.");
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

  if (loadError) {
    return (
      <Layout>
        <section className="page-section">
          <div className="error">{loadError}</div>
        </section>
      </Layout>
    );
  }

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
        <div className="card product-public-card">
          {product.coverUrl ? (
            <div className="product-public-cover">
              <img src={product.coverUrl} alt="" />
            </div>
          ) : null}
          <div className="tag">Creator product</div>
          <h2 className="section-title" style={{ marginTop: "8px" }}>{product.title}</h2>
          {product.summary ? <p className="product-summary">{product.summary}</p> : null}
          <p className="section-sub">
            <FormatProductDescription text={product.description} />
          </p>
          {product.productInfo ? (
            <div className="product-info-block">
              <div className="tag">What you get</div>
              <p className="section-sub">{product.productInfo}</p>
            </div>
          ) : null}
          <p className="product-price">{formatProductPrice(product)}</p>
          <p className="card-meta">Creator: {shorten(product.creatorWallet)}</p>
          {status && <div className="notice" style={{ marginTop: "12px" }}>{status}</div>}
          {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              disabled={busy || product.currency === "USDC"}
              onClick={buy}
            >
              {busy ? "Processing..." : product.currency === "USDC" ? "USDC soon" : "Buy now"}
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

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/dashboard" element={<DashboardShell />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<DashboardHomePage />} />
        <Route path="products" element={<DashboardProductsPage />} />
        <Route path="products/new" element={<DashboardNewProductPage />} />
      </Route>
      <Route path="/p/:id" element={<ProductPage />} />
      <Route path="/:slug" element={<ProductPage />} />
    </Routes>
  );
}
