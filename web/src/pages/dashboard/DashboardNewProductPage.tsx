import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { CRYPTO_OPTIONS, formatProductPrice, readFileAsDataUrl } from "../../lib/productUtils";
import { productPublicUrl } from "../../lib/productUtils";
import { useWallet } from "@solana/wallet-adapter-react";
import type { ProductShape } from "../../types/product";

const PRODUCT_TYPES = [
  { id: "digital", title: "Digital product", desc: "Files, templates, presets, or downloads.", emoji: "📦" },
  { id: "course", title: "Course or tutorial", desc: "Structured lessons buyers unlock.", emoji: "🎓" },
  { id: "ebook", title: "E-book", desc: "Long-form written content.", emoji: "📖" },
  { id: "membership", title: "Membership", desc: "Recurring access to your work.", emoji: "⭐" },
  { id: "bundle", title: "Bundle", desc: "Multiple products in one.", emoji: "🎁" },
];

const SERVICE_TYPES = [
  { id: "commission", title: "Commission", desc: "Custom work for buyers.", emoji: "✏️" },
  { id: "call", title: "Call", desc: "Scheduled calls.", emoji: "📞" },
  { id: "coffee", title: "Coffee", desc: "Support tips.", emoji: "☕" },
];

export function DashboardNewProductPage() {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [draft, setDraft] = useState({
    name: "",
    productType: "digital",
    currency: "SOL" as "SOL" | "USDC",
    priceAmount: "",
    description: "",
    summary: "",
    productInfo: "",
    coverUrl: "",
    thumbnailUrl: "",
    contentUrl: "",
  });

  const selectedCrypto = CRYPTO_OPTIONS.find((c) => c.code === draft.currency) ?? CRYPTO_OPTIONS[0];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setCurrencyOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const canStep1 = draft.name.trim().length >= 2 && draft.productType && Number(draft.priceAmount) > 0;
  const canStep2 =
    draft.name.trim().length >= 2 &&
    draft.description.trim().length >= 5 &&
    draft.contentUrl.trim().length > 0 &&
    /^https?:\/\//i.test(draft.contentUrl.trim());

  const goCustomize = () => {
    if (!canStep1) {
      setError("Add a name, pick a product type, and set a valid price.");
      return;
    }
    setError("");
    setStep(2);
  };

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet || !canStep2) {
      setError("Fill description and a valid content URL (https://…).");
      return;
    }
    setSubmitting(true);
    setError("");
    const price = Number(draft.priceAmount);
    try {
      const { data } = await api.post<ProductShape>("/products", {
        title: draft.name.trim(),
        description: draft.description.trim(),
        summary: draft.summary.trim() || undefined,
        productInfo: draft.productInfo.trim() || undefined,
        contentUrl: draft.contentUrl.trim(),
        coverUrl: draft.coverUrl || undefined,
        thumbnailUrl: draft.thumbnailUrl || undefined,
        currency: draft.currency,
        priceSol: draft.currency === "SOL" ? price : 0,
        priceUsdc: draft.currency === "USDC" ? price : 0,
        productType: draft.productType,
        creatorWallet: wallet,
        status: "published",
      });
      setCreatedId(data._id);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ripple_gs_share", "1");
      }
      setStep(3);
    } catch {
      setError("Could not publish. Check fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!createdId) return;
    void navigator.clipboard.writeText(productPublicUrl(createdId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewProduct: Pick<ProductShape, "currency" | "priceSol" | "priceUsdc"> = {
    currency: draft.currency,
    priceSol: draft.currency === "SOL" ? Number(draft.priceAmount) || 0 : 0,
    priceUsdc: draft.currency === "USDC" ? Number(draft.priceAmount) || 0 : 0,
  };

  return (
    <div className="gum-page gum-page--wide">
      <div className="gum-new-top">
        <div>
          <h1 className="gum-page__h1">
            {step === 1 ? "What are you creating?" : step === 2 ? draft.name || "New product" : "Share your product"}
          </h1>
          {step === 1 ? (
            <p className="gum-page__lead">
              Turn your idea into a live product in minutes. Start with a name, type, and price — then customize how it looks.
            </p>
          ) : null}
        </div>
        <div className="gum-new-top__actions">
          {step < 3 ? (
            <button type="button" className="gum-btn gum-btn--ghost" onClick={() => navigate("/dashboard/products")}>
              Cancel
            </button>
          ) : (
            <Link to="/dashboard/products" className="gum-btn gum-btn--ghost">
              Back to products
            </Link>
          )}
          {step === 1 ? (
            <button type="button" className="gum-btn gum-btn--pink" onClick={goCustomize} disabled={!canStep1}>
              Next: Customize
            </button>
          ) : null}
          {step === 2 ? (
            <button type="submit" form="form-customize" className="gum-btn gum-btn--pink" disabled={submitting || !canStep2}>
              {submitting ? "Saving…" : "Next: Share"}
            </button>
          ) : null}
        </div>
      </div>

      {step === 1 ? (
        <div className="gum-new-grid">
          <aside className="gum-new-aside">
            <p className="gum-muted">
              Need help adding a product? Use a clear title, pick the closest type, and price in SOL or USDC (USDC is display-only until
              SPL checkout lands).
            </p>
            <a href="https://github.com/sachinacharyaa/Ripple" className="gum-link" target="_blank" rel="noreferrer">
              View docs
            </a>
          </aside>
          <div className="gum-new-main">
            <div className="gum-field">
              <label className="gum-label">Name</label>
              <input
                className="gum-input"
                placeholder="Name of product"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div className="gum-field">
              <span className="gum-label">Products</span>
              <div className="gum-type-grid">
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`gum-type-card${draft.productType === t.id ? " gum-type-card--selected" : ""}`}
                    onClick={() => setDraft((d) => ({ ...d, productType: t.id }))}
                  >
                    <span className="gum-type-card__emoji">{t.emoji}</span>
                    <div className="gum-type-card__title">{t.title}</div>
                    <p className="gum-type-card__desc">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="gum-field">
              <span className="gum-label gum-label--dim">Services (coming soon)</span>
              <div className="gum-type-grid gum-type-grid--dim">
                {SERVICE_TYPES.map((t) => (
                  <div key={t.id} className="gum-type-card gum-type-card--disabled">
                    <span className="gum-type-card__emoji">{t.emoji}</span>
                    <div className="gum-type-card__title">{t.title}</div>
                    <p className="gum-type-card__desc">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="gum-field">
              <label className="gum-label">Price</label>
              <div className="dash-price-bar gum-price-bar" ref={menuRef}>
                <div className="dash-price-bar__left">
                  <button
                    type="button"
                    className="dash-currency-trigger"
                    aria-expanded={currencyOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrencyOpen((o) => !o);
                    }}
                  >
                    <span>{selectedCrypto.symbol}</span>
                    <span className="dash-chevron">▾</span>
                  </button>
                  {currencyOpen ? (
                    <ul className="dash-currency-menu" role="listbox">
                      {CRYPTO_OPTIONS.map((opt) => (
                        <li key={opt.code}>
                          <button
                            type="button"
                            className={opt.code === draft.currency ? "dash-currency-menu__item dash-currency-menu__item--active" : "dash-currency-menu__item"}
                            onClick={() => {
                              setDraft((d) => ({ ...d, currency: opt.code }));
                              setCurrencyOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <input
                  className="dash-price-bar__input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Price your product"
                  value={draft.priceAmount}
                  onChange={(e) => setDraft((d) => ({ ...d, priceAmount: e.target.value }))}
                />
              </div>
            </div>

            {error ? <div className="dash-alert dash-alert--error">{error}</div> : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="gum-customize-layout">
          <div className="gum-customize-form">
            <div className="gum-workflow-tabs">
              <span className="gum-workflow-tab gum-workflow-tab--active">Product</span>
              <span className="gum-workflow-tab">Content</span>
              <span className="gum-workflow-tab">Receipt</span>
              <span className="gum-workflow-tab">Share</span>
            </div>

            <form id="form-customize" onSubmit={publish}>
              <div className="gum-field">
                <label className="gum-label">Name</label>
                <input className="gum-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required minLength={2} />
              </div>
              <div className="gum-field">
                <label className="gum-label">Description</label>
                <div className="dash-editor-toolbar">
                  <span>B</span>
                  <span>I</span>
                  <span>U</span>
                  <span>Link</span>
                  <span>Media</span>
                </div>
                <textarea
                  className="gum-textarea gum-textarea--editor"
                  placeholder="Describe your product…"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  required
                  minLength={5}
                />
              </div>
              <div className="gum-field">
                <label className="gum-label">Summary</label>
                <textarea
                  className="gum-textarea"
                  placeholder="Short line for cards and search"
                  value={draft.summary}
                  onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                  maxLength={2000}
                />
              </div>
              <div className="gum-upload-row">
                <div className="gum-field">
                  <label className="gum-label">Cover</label>
                  <div className="dash-dropzone gum-dropzone">
                    {draft.coverUrl ? <img src={draft.coverUrl} alt="" className="dash-preview-img dash-preview-img--wide" /> : <span className="dash-dropzone__placeholder">+ Upload cover</span>}
                    <input
                      type="file"
                      accept="image/*"
                      className="dash-file-input"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const dataUrl = await readFileAsDataUrl(f);
                          setDraft((d) => ({ ...d, coverUrl: dataUrl }));
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="gum-field">
                  <label className="gum-label">Thumbnail</label>
                  <div className="dash-dropzone dash-dropzone--square gum-dropzone">
                    {draft.thumbnailUrl ? <img src={draft.thumbnailUrl} alt="" className="dash-preview-img" /> : <span className="dash-dropzone__placeholder">+ Thumb</span>}
                    <input
                      type="file"
                      accept="image/*"
                      className="dash-file-input"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const dataUrl = await readFileAsDataUrl(f);
                          setDraft((d) => ({ ...d, thumbnailUrl: dataUrl }));
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="gum-field">
                <label className="gum-label">Product info</label>
                <textarea
                  className="gum-textarea"
                  placeholder="What buyers get, file formats, access details…"
                  value={draft.productInfo}
                  onChange={(e) => setDraft((d) => ({ ...d, productInfo: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="gum-field">
                <label className="gum-label">Content URL</label>
                <input
                  className="gum-input"
                  type="url"
                  placeholder="https://…"
                  value={draft.contentUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, contentUrl: e.target.value }))}
                  required
                />
              </div>
              {error ? <div className="dash-alert dash-alert--error">{error}</div> : null}
            </form>
          </div>
          <aside className="gum-preview-col">
            <div className="gum-preview-title">Preview</div>
            <div className="dash-preview-card gum-preview-live">
              <div className="dash-preview-card__cover">
                {draft.coverUrl ? <img src={draft.coverUrl} alt="" /> : <span>Cover</span>}
              </div>
              <div className="dash-preview-card__body">
                <div className="dash-preview-card__thumb">{draft.thumbnailUrl ? <img src={draft.thumbnailUrl} alt="" /> : null}</div>
                <div>
                  <div className="dash-preview-card__title">{draft.name || "Product"}</div>
                  <div className="dash-preview-card__price">{formatProductPrice(previewProduct)}</div>
                  <p className="dash-preview-card__summary">{draft.summary || draft.description || "Description preview"}</p>
                  {draft.productInfo ? <p className="dash-preview-card__note">{draft.productInfo}</p> : null}
                </div>
              </div>
              <p className="dash-preview-card__note">Buyers see this page after they pay with SOL.</p>
            </div>
          </aside>
        </div>
      ) : null}

      {step === 3 && createdId ? (
        <div className="gum-share-panel">
          <p className="gum-share-lead">Your product is live. Share this link anywhere — buyers get the full product page with cover, price, and buy flow.</p>
          <div className="gum-share-url-row">
            <code className="gum-share-url">{productPublicUrl(createdId)}</code>
            <button type="button" className="gum-btn gum-btn--pink" onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <div className="gum-share-actions">
            <a href={productPublicUrl(createdId)} target="_blank" rel="noreferrer" className="gum-btn gum-btn--ghost">
              Open buyer page
            </a>
            <Link to="/dashboard/products" className="gum-link">
              Return to products
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
