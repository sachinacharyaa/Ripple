import type { ReactNode } from "react";
import { FloatingCoins } from "./FloatingCoins";
import { SiteHeader } from "./SiteHeader";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <FloatingCoins />
      <SiteHeader />
      <div className="app-main">{children}</div>
    </>
  );
}
