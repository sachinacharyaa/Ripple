import { Link, Outlet } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { DashboardConnectScreen } from "../pages/dashboard/DashboardConnectScreen";
import { DashboardSidebar } from "../pages/dashboard/DashboardSidebar";

export function DashboardShell() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return <DashboardConnectScreen />;
  }

  return (
    <div className="gum-dashboard">
      <header className="gum-topbar">
        <Link to="/" className="gum-topbar__brand">
          Rivo
        </Link>
        <div className="gum-topbar__right">
          <WalletMultiButton className="gum-wallet-btn gum-wallet-btn--compact" />
        </div>
      </header>
      <div className="gum-dashboard__body">
        <DashboardSidebar />
        <main className="gum-dashboard__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
