import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="app-main">{children}</div>
    </>
  );
}
