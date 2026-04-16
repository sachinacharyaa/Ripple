import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { api } from "./lib/api";
import axios from "axios";
import {
  handlePayment,
  RIPPLE_FEE_WALLET,
} from "./lib/payment";
import { formatProductPrice, productPublicPath } from "./lib/productUtils";
import { FormatProductDescription } from "./lib/richDescription";
import type { ProductShape } from "./types/product";
import { DashboardShell } from "./layouts/DashboardShell";
import { DashboardHomePage } from "./pages/dashboard/DashboardHomePage";
import { DashboardProductsPage } from "./pages/dashboard/DashboardProductsPage";
import { DashboardNewProductPage } from "./pages/dashboard/DashboardNewProductPage";
import { DashboardEditProductPage } from "./pages/dashboard/DashboardEditProductPage";
import { DashboardPaymentPage } from "./pages/dashboard/DashboardPaymentPage";
import { DashboardDiscoverPage } from "./pages/dashboard/DashboardDiscoverPage";

type Product = ProductShape;

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

function Layout({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "dashboard";
}) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [copied, setCopied] = useState(false);

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

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
            Start selling
          </Link>
          <WalletMultiButton className="wallet-multi-btn" />
        </div>
      </header>
      <main
        className={
          variant === "dashboard" ? "main main--dashboard-pro" : "main"
        }
      >
        {children}
      </main>
      <footer
        className={
          variant === "dashboard" ? "footer footer--dashboard-pro" : "footer"
        }
      >
        <span className="footer-powered">
          Powered by <span className="footer-powered__badge">Ripple</span>
        </span>
        <button
          className="footer-share-btn"
          type="button"
          aria-label="Copy page link"
          onClick={copyCurrentLink}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 8a3 3 0 1 0-2.83-4h-.34A3 3 0 0 0 9 8l-3.8 2.17a3 3 0 1 0 0 3.66L9 16a3 3 0 1 0 2.83 4h.34A3 3 0 0 0 15 16l3.8-2.17a3 3 0 1 0 0-3.66L15 8Z"
              fill="currentColor"
            />
          </svg>
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
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
    return products.filter((p) =>
      `${p.title} ${p.description}`.toLowerCase().includes(lower),
    );
  }, [products, query]);

  return (
    <Layout>
      <section className="hero" id="discover">
        <div className="hero-coins" aria-hidden="true">
          <Coins />
        </div>
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="hero-tag"
          >
            Decentralized creator monetization
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="hero-title"
          >
            Go from 0 to 1$OL
          </motion.h1>
          <p className="hero-sub">
            Ripple lets anyone sell digital content, accept instant crypto
            payments, and unlock access with a wallet.
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
            <h2 className="section-title">
              A creator-first Solana marketplace
            </h2>
            <p className="section-sub">
              Ripple removes platform lock-in so creators can sell anything,
              anywhere, and get paid instantly with crypto.
            </p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="card-title">The problem</div>
            <p className="card-meta">
              Legacy platforms charge high fees, require Stripe/PayPal, and can
              ban creators.
            </p>
          </div>
          <div className="card">
            <div className="card-title">The solution</div>
            <p className="card-meta">
              Sell digital content, set a SOL price, and unlock access
              immediately with on-chain verification.
            </p>
          </div>
          <div className="card">
            <div className="card-title">The impact</div>
            <p className="card-meta">
              Creators keep control, earn globally, and gate access using
              wallets instead of emails.
            </p>
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
            <p className="card-meta">
              Indie creators, students, devs, designers, freelancers, and
              AI/tech educators.
            </p>
          </div>
          <div className="card">
            <div className="card-title">Secondary</div>
            <p className="card-meta">
              Buyers looking for templates, courses, notes, and creator tools.
            </p>
          </div>
          <div className="card">
            <div className="card-title">Global</div>
            <p className="card-meta">
              Anyone blocked by legacy payment rails can earn with Solana.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-kicker">Core features</div>
            <h2 className="section-title">
              Everything you need to sell on-chain
            </h2>
            <p className="section-sub">
              SOL payments now, USDC support coming next.
            </p>
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
              <p className="card-meta">
                Powered by Solana for fast settlement.
              </p>
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
            <p className="section-sub">
              Real listings from creators using the Ripple workflow.
            </p>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="marketplace-grid">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div
                className="card product-card skeleton-card"
                key={k}
                aria-hidden
              >
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
              <Link
                to={productPublicPath(product)}
                key={product._id}
                className="card product-card"
              >
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt=""
                    className="product-card__thumb"
                  />
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
                <div className="product-price">
                  {formatProductPrice(product)}
                </div>
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
    return products.filter((p) =>
      `${p.title} ${p.description}`.toLowerCase().includes(lower),
    );
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
              <div
                className="card product-card skeleton-card"
                key={k}
                aria-hidden
              >
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
              <Link
                to={productPublicPath(product)}
                key={product._id}
                className="card product-card"
              >
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt=""
                    className="product-card__thumb"
                  />
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
                <div className="product-price">
                  {formatProductPrice(product)}
                </div>
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
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const networkLabel = useMemo(() => {
    const endpoint = (connection.rpcEndpoint || "").toLowerCase();
    if (endpoint.includes("testnet")) return "testnet";
    if (endpoint.includes("mainnet")) return "mainnet";
    return "devnet";
  }, [connection.rpcEndpoint]);

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
    setTxSignature("");

    if (!publicKey) {
      setError("Connect your wallet first (header or wallet button).");
      return;
    }

    if (product.currency === "USDC") {
      setError(
        "This listing is priced in USDC. On-chain checkout for USDC is not enabled yet — ask the creator for a SOL-priced version.",
      );
      return;
    }

    setBusy(true);
    try {
      const buyerWallet = publicKey.toBase58();
      const creatorAddress = product.payoutWallet || product.creatorWallet;
      setStatus("Preparing split payment...");
      setStatus("Awaiting wallet approval...");
      const signature = await handlePayment({
        connection,
        wallet: { publicKey, sendTransaction },
        productPriceSol: product.priceSol,
        creatorAddress,
        platformAddress: RIPPLE_FEE_WALLET,
      });
      setTxSignature(signature);

      setStatus("Verifying on-chain payment...");
      await api.post("/purchases/verify", {
        productId: product._id,
        buyerWallet,
        txSignature: signature,
      });

      setStatus("Unlocking content...");
      const access = await api.post("/access/unlock", {
        productId: product._id,
        buyerWallet,
      });
      setContentLink(access.data.contentUrl);
      setStatus("Unlocked! Enjoy your content.");
    } catch (e) {
      setStatus("");
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { message?: string; error?: string } | undefined;
        setError(data?.message || data?.error || e.message);
      } else if (e instanceof Error) {
        setError(e.message || `Payment failed. Make sure your wallet is connected to ${networkLabel} and try again.`);
      } else {
        setError(`Payment failed. Make sure your wallet is connected to ${networkLabel} and try again.`);
      }
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

  const explorerProofUrl = txSignature
    ? `https://explorer.solana.com/tx/${txSignature}?cluster=${networkLabel}`
    : "";

  return (
    <Layout>
      <section className="page-section">
        <div className="product-public-card">
          <div className="product-public-media">
            {product.coverUrl || product.thumbnailUrl ? (
              <img src={product.coverUrl || product.thumbnailUrl} alt={product.title} />
            ) : (
              <div className="product-public-media__ph">No image</div>
            )}
          </div>

          <div className="product-public-panel">
            <div className="product-public-header">
              <h2 className="product-public-title">{product.title}</h2>
              <div className="product-public-price">{formatProductPrice(product)}</div>
            </div>

            <div className="product-public-actions">
              <button
                className="btn btn-primary"
                disabled={busy || product.currency === "USDC"}
                onClick={buy}
                type="button"
              >
                {busy
                  ? "Processing..."
                  : product.currency === "USDC"
                    ? "USDC soon"
                    : "Buy now"}
              </button>
              <button className="btn btn-outline" type="button">
                Add to cart
              </button>
            </div>

            {status && !error ? (
              <div className="product-public-toast product-public-toast--info">
                {status}
              </div>
            ) : null}
            {error ? (
              <div className="product-public-toast product-public-toast--error">
                {error}
              </div>
            ) : null}

            {contentLink ? (
              <div className="product-public-unlock product-public-unlock--hero">
                <div className="product-public-unlock__head">
                  <div>
                    <div className="tag tag--success">Access unlocked</div>
                    <p className="product-public-unlock__title">
                      Your content link is ready.
                    </p>
                  </div>
                  {txSignature ? (
                    <a
                      className="product-public-proof"
                      href={explorerProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Transaction proof
                    </a>
                  ) : null}
                </div>
                <div className="product-public-unlock__actions">
                  <a
                    className="btn btn-secondary"
                    href={contentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open content
                  </a>
                  {txSignature ? (
                    <a
                      className="btn btn-outline"
                      href={explorerProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on explorer
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="product-public-copy">
              {product.summary ? (
                <p className="product-summary">{product.summary}</p>
              ) : null}
              <p className="product-public-desc">
                <FormatProductDescription text={product.description} />
              </p>
            </div>

            {product.productInfo ? (
              <div className="product-info-block">
                <div className="tag">What you get</div>
                <p className="section-sub">{product.productInfo}</p>
              </div>
            ) : null}
          </div>
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
        <Route path="products/:id/edit" element={<DashboardEditProductPage />} />
        <Route path="payment" element={<DashboardPaymentPage />} />
        <Route path="discover" element={<DashboardDiscoverPage />} />
      </Route>
      <Route path="/p/:id" element={<ProductPage />} />
      <Route path="/:slug" element={<ProductPage />} />
    </Routes>
  );
}
