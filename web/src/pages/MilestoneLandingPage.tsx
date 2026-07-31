import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Stat = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  caption: string;
};

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

const ORBS = [1, 2, 3, 4, 5];

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

export function MilestoneLandingPage() {
  return (
    <main className="milestone">
      <div className="milestone__aurora" aria-hidden="true" />
      <div className="milestone__grid" aria-hidden="true" />
      <div className="milestone__orbs" aria-hidden="true">
        {ORBS.map((orb) => (
          <span key={orb} className={`milestone-orb milestone-orb--${orb}`}>
            R
          </span>
        ))}
      </div>

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

        <motion.p
          className="milestone__footnote"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          Mainnet launch coming soon
        </motion.p>
      </section>
    </main>
  );
}
