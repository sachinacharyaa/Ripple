import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function DashboardConnectScreen() {
  return (
    <div className="gum-dashboard gum-dashboard--gate">
      <header className="gum-topbar">Ripple</header>
      <div className="gum-connect-panel">
        <h1 className="gum-connect-panel__title">Creator dashboard</h1>
        <p className="gum-connect-panel__sub">Connect your wallet to open your Ripple workspace.</p>
        <WalletMultiButton className="gum-wallet-btn" />
      </div>
    </div>
  );
}
