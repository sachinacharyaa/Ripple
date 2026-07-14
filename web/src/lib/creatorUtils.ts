export function normalizeCreatorHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function creatorPublicPath(handle: string) {
  return `/@${normalizeCreatorHandle(handle)}`;
}

export function creatorPublicUrl(handle: string) {
  return `${window.location.origin}${creatorPublicPath(handle)}`;
}

export function creatorInitials(displayName: string, handle: string) {
  const source = (displayName || handle).trim();
  if (!source) return "R";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
