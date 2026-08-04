import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";

type Stat = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  caption: string;
};

const CONTACT_EMAIL = "thesachinacharya77@gmail.com";
const DISCORD_URL = "https://discord.gg/THpac3zG5";

const STATS: Stat[] = [
  {
    id: "volume",
    label: "Trade volume",
    value: 5000,
    prefix: "$",
    caption: "Settled on-chain through Rivo checkout",
  },
  {
    id: "buyers",
    label: "Buyers",
    value: 21,
    caption: "Unique wallets that completed a purchase",
  },
  {
    id: "products",
    label: "Products",
    value: 10,
    suffix: "+",
    caption: "Digital goods published by creators",
  },
];

function useCountUp(target: number, durationMs: number) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return value;
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const value = useCountUp(stat.value, 1600 + index * 200);

  return (
    <motion.li
      className="milestone-stat"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 + index * 0.14, ease: "easeOut" }}
    >
      <span className="milestone-stat__label">{stat.label}</span>
      <span className="milestone-stat__value">
        {stat.prefix}
        {value.toLocaleString("en-US")}
        {stat.suffix}
      </span>
      <span className="milestone-stat__caption">{stat.caption}</span>
    </motion.li>
  );
}

function ProductLeadForm() {
  const [email, setEmail] = useState("");
  const [productName, setProductName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const canSubmit =
    email.trim().length > 3 && productName.trim().length >= 2 && oneLiner.trim().length >= 5;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await api.post<{ success?: boolean; message?: string }>("/product-leads", {
        email: email.trim(),
        productName: productName.trim(),
        oneLiner: oneLiner.trim(),
      });
      setStatus("success");
      setMessage(res.data?.message || "Thanks — we received your product details.");
      setEmail("");
      setProductName("");
      setOneLiner("");
    } catch (error) {
      const apiMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? String((error.response.data as { message?: string }).message || "")
          : "";
      setStatus("error");
      setMessage(apiMessage || "Could not send right now. Try again in a moment.");
    }
  };

  return (
    <form className="milestone-footer__form" onSubmit={handleSubmit}>
      <div className="milestone-footer__form-head">
        <h2>List your product later</h2>
        <p>Drop your email, product name, and a one-liner. We&apos;ll reach out when listings reopen.</p>
      </div>

      <div className="milestone-footer__fields">
        <label className="milestone-footer__field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="milestone-footer__field">
          <span>Product name</span>
          <input
            type="text"
            name="productName"
            placeholder="e.g. Solana prompt pack"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            maxLength={120}
            required
          />
        </label>
        <label className="milestone-footer__field milestone-footer__field--wide">
          <span>One-liner</span>
          <input
            type="text"
            name="oneLiner"
            placeholder="What is it, in one short sentence?"
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            maxLength={280}
            required
          />
        </label>
      </div>

      <div className="milestone-footer__form-actions">
        <button type="submit" disabled={!canSubmit || status === "loading"}>
          {status === "loading" ? "Sending…" : "Send details"}
        </button>
        {message ? (
          <p
            className={`milestone-footer__form-msg${
              status === "error" ? " milestone-footer__form-msg--error" : ""
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function MilestoneFooter() {
  return (
    <motion.footer
      className="milestone-footer"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.15, ease: "easeOut" }}
    >
      <div className="milestone-footer__glass">
        <div className="milestone-footer__meta">
          <p className="milestone-footer__brand">Rivo</p>
          <p className="milestone-footer__note">
            Devnet goal complete. Stay close for what comes next.
          </p>
          <div className="milestone-footer__links">
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Discord
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </div>
        <ProductLeadForm />
      </div>
    </motion.footer>
  );
}

export function MilestoneLandingPage() {
  return (
    <main className="milestone">
      <div className="milestone__aurora" aria-hidden="true" />
      <div className="milestone__grid" aria-hidden="true" />

      <section className="milestone__inner">
        <motion.p
          className="milestone__badge"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="milestone__badge-dot" aria-hidden="true" />
          Devnet milestone reached
        </motion.p>

        <motion.h1
          className="milestone__title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          Rivo just crossed{" "}
          <span className="milestone__title-accent">$5,000</span> in trade
          volume
        </motion.h1>

        <motion.p
          className="milestone__sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
        >
          Creators sold digital products, buyers paid with their wallets, and
          every payout settled instantly on Solana. Thank you for testing Rivo
          with us.
        </motion.p>

        <ul className="milestone__stats">
          {STATS.map((stat, index) => (
            <StatCard key={stat.id} stat={stat} index={index} />
          ))}
        </ul>

        <motion.div
          className="milestone__progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="milestone__progress-head">
            <span>Devnet goal</span>
            <span>100% complete</span>
          </div>
          <div className="milestone__progress-track">
            <motion.div
              className="milestone__progress-fill"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, delay: 1.1, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>

      <MilestoneFooter />
    </main>
  );
}
