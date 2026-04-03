export interface PhantomPublicKey {
  toString(): string;
  toBytes?(): Uint8Array;
}

export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PhantomPublicKey | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PhantomPublicKey }>;
  disconnect(): Promise<void>;
  signTransaction(tx: unknown): Promise<unknown>;
  signAndSendTransaction?(
    tx: unknown,
    options?: { skipPreflight?: boolean }
  ): Promise<{ signature: string }>;
  on(event: "accountChanged", handler: (pk: PhantomPublicKey | null) => void): void;
  removeListener(
    event: "accountChanged",
    handler: (pk: PhantomPublicKey | null) => void
  ): void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export {};
