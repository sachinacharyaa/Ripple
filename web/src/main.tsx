import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletProviders } from "./WalletProviders";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletProviders>
  </React.StrictMode>,
);
