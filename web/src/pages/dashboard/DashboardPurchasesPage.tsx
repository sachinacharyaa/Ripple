import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { api } from "../../lib/api";
import { productPublicPath } from "../../lib/productUtils";
import type { ProductShape } from "../../types/product";

type PurchaseRecord = {
  _id: string;
  buyerWallet: string;
  txSignature: string;
  amountSol: number;
  status: string;
  createdAt?: string;
  productId?: ProductShape | null;
};

function shorten(address: string) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function DashboardPurchasesPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [items, setItems] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    setError("");
    api
      .get<PurchaseRecord[]>(`/purchases/wallet/${wallet}`)
      .then((res) => setItems(res.data))
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string } | undefined;
          setError(data?.message || "Unable to load purchases.");
        } else {
          setError("Unable to load purchases.");
        }
      })
      .finally(() => setLoading(false));
  }, [wallet]);

  const totalSpent = useMemo(
    () => items.reduce((acc, p) => acc + (p.amountSol || 0), 0),
    [items],
  );

  if (!wallet) {
    return (
      <div className="gum-page">
        <p className="gum-muted">Connect your wallet to see your purchases.</p>
      </div>
    );
  }

  return (
    <div className="gum-page">
      <div className="gum-products-header">
        <h1 className="gum-page__h1">Purchases</h1>
        <div className="gum-products-header__actions">
          <div className="gum-chip-row">
            <span className="gum-chip">
              {items.length} purchase{items.length === 1 ? "" : "s"}
            </span>
            <span className="gum-chip gum-chip--muted">
              Total spent: {totalSpent.toFixed(2)} SOL
            </span>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="gum-muted">Loading purchases…</p>
      ) : items.length === 0 ? (
        <div className="gum-empty">
          No purchases yet.{" "}
          <Link to="/dashboard/discover" className="gum-link">
            Discover products
          </Link>
          .
        </div>
      ) : (
        <div className="gum-table-wrap">
          <table className="gum-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Creator</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const product = p.productId;
                const status =
                  p.status === "confirmed" ? "Confirmed" : p.status || "Pending";
                const hasProduct = Boolean(product && product._id);
                return (
                  <tr key={p._id}>
                    <td>
                      {hasProduct ? (
                        <Link
                          to={productPublicPath(product as ProductShape)}
                          className="gum-link"
                        >
                          {(product as ProductShape).title}
                        </Link>
                      ) : (
                        <span className="gum-muted">Product unavailable</span>
                      )}
                    </td>
                    <td>
                      {product ? shorten(product.creatorWallet) : "—"}
                    </td>
                    <td>{(p.amountSol || 0).toFixed(2)} SOL</td>
                    <td>
                      <span
                        className={`gum-status gum-status--${
                          status === "Confirmed" ? "live" : "draft"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="gum-table-actions">
                        {p.txSignature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${p.txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="gum-link gum-link--secondary"
                          >
                            Proof
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

