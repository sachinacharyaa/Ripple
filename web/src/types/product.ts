export type ProductShape = {
  _id: string;
  slug?: string;
  title: string;
  description: string;
  summary?: string;
  productInfo?: string;
  productType?: string;
  status?: "draft" | "published";
  priceSol: number;
  priceUsdc?: number;
  currency?: "SOL" | "USDC";
  contentUrl: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  creatorWallet: string;
  salesCount: number;
  createdAt?: string;
};
