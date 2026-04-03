/** JSON stored at `metadata_uri` (IPFS / HTTPS). */
export type IpfsProductMetadata = {
  title: string;
  description: string;
  contentUrl: string;
};

export function buildMetadataJson(meta: IpfsProductMetadata): string {
  return JSON.stringify(
    { title: meta.title, description: meta.description, contentUrl: meta.contentUrl },
    null,
    0
  );
}

/** SHA-256 of UTF-8 bytes → 32-byte array (matches on-chain `[u8;32]`). */
export async function sha256Utf8(text: string): Promise<Uint8Array> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}
