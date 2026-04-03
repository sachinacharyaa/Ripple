import { IPFS_GATEWAY } from "./constants";

/** Turn `ipfs://cid/path` into a gateway URL. */
export function resolveMetadataUrl(uri: string): string {
  const u = uri.trim();
  if (u.startsWith("ipfs://")) {
    const path = u.replace(/^ipfs:\/\//, "");
    return `${IPFS_GATEWAY.replace(/\/$/, "")}/${path}`;
  }
  return u;
}

export async function fetchIpfsMetadata(
  uri: string
): Promise<{ title: string; description: string; contentUrl: string }> {
  const url = resolveMetadataUrl(uri);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);
  const json = (await res.json()) as Record<string, unknown>;
  const title = String(json.title ?? "");
  const description = String(json.description ?? "");
  const contentUrl = String(json.contentUrl ?? json.content_url ?? "");
  if (!title || !contentUrl) {
    throw new Error("Metadata JSON must include title and contentUrl");
  }
  return { title, description, contentUrl };
}
