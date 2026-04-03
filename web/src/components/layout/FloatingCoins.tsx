"use client";

import { useEffect } from "react";

const coins = [
  { className: "coin coin--1", label: "1" },
  { className: "coin coin--2", label: "2" },
  { className: "coin coin--4", label: "4" },
  { className: "coin coin--5", label: "5" },
  { className: "coin coin--6", label: "6" },
  { className: "coin coin--7", label: "7" },
];

export function FloatingCoins() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const els = document.querySelectorAll<HTMLElement>(".coin");
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      els.forEach((coin, i) => {
        const factor = (i + 1) * 6;
        coin.style.setProperty("--parallax-x", `${dx * factor}px`);
        coin.style.setProperty("--parallax-y", `${dy * factor}px`);
        coin.style.setProperty("--parallax-rx", `${dy * factor}deg`);
        coin.style.setProperty("--parallax-ry", `${-dx * factor}deg`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      {coins.map((c) => (
        <div key={c.label} className={c.className} aria-hidden>
          <div className="coin__face">R</div>
        </div>
      ))}
    </>
  );
}
