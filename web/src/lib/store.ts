import type { Product, Purchase } from "@/types/product";
import { STORAGE_PRODUCTS, STORAGE_PURCHASES } from "./constants";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ripple-storage"));
}

export function getProducts(): Product[] {
  return readJson<Product[]>(STORAGE_PRODUCTS, []);
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function saveProduct(product: Product) {
  const toSave: Product = { ...product, source: product.source ?? "local" };
  const all = getProducts();
  const i = all.findIndex((p) => p.id === product.id);
  if (i >= 0) all[i] = toSave;
  else all.unshift(toSave);
  writeJson(STORAGE_PRODUCTS, all);
}

export function deleteProduct(id: string) {
  writeJson(
    STORAGE_PRODUCTS,
    getProducts().filter((p) => p.id !== id)
  );
}

export function getProductsByCreator(creatorWallet: string): Product[] {
  return getProducts().filter((p) => p.creatorWallet === creatorWallet);
}

export function getPurchases(): Purchase[] {
  return readJson<Purchase[]>(STORAGE_PURCHASES, []);
}

export function recordPurchase(purchase: Purchase) {
  const all = getPurchases();
  all.unshift(purchase);
  writeJson(STORAGE_PURCHASES, all);
}

export function getPurchasesByBuyer(buyerWallet: string): Purchase[] {
  return getPurchases().filter((p) => p.buyerWallet === buyerWallet);
}

export function getPurchasesByCreator(creatorWallet: string): Purchase[] {
  return getPurchases().filter((p) => p.creatorWallet === creatorWallet);
}

export function hasPurchased(
  buyerWallet: string,
  productId: string
): boolean {
  return getPurchases().some(
    (p) => p.buyerWallet === buyerWallet && p.productId === productId
  );
}

export function salesCountForProduct(productId: string): number {
  return getPurchases().filter((p) => p.productId === productId).length;
}

export function earningsForCreator(creatorWallet: string): number {
  return getPurchasesByCreator(creatorWallet).reduce(
    (sum, p) => sum + p.amountLamports,
    0
  );
}
