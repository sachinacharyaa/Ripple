import type { ProductShape } from "./product";

export type CreatorSocialLinks = {
  website?: string;
  x?: string;
  discord?: string;
};

export type CreatorCollection = {
  _id?: string;
  title: string;
  productIds: string[];
  order: number;
  products?: ProductShape[];
};

export type CreatorProfileShape = {
  wallet: string;
  handle: string;
  displayName: string;
  bio: string;
  socialLinks: CreatorSocialLinks;
  featuredProductId?: string;
  collections: CreatorCollection[];
  createdAt?: string;
  updatedAt?: string;
};

export type PublicCreatorProfile = CreatorProfileShape & {
  featuredProduct?: ProductShape | null;
  products: ProductShape[];
};
