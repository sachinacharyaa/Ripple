import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "../../lib/api";
import { creatorPublicUrl, normalizeCreatorHandle } from "../../lib/creatorUtils";
import type { CreatorProfileShape } from "../../types/creator";

const emptyProfile = (wallet: string): CreatorProfileShape => ({
  wallet,
  handle: "",
  displayName: "",
  bio: "",
  socialLinks: { website: "", x: "" },
  featuredProductId: "",
  collections: [],
});

export function DashboardProfileSettingsPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [profile, setProfile] = useState<CreatorProfileShape>(() => emptyProfile(""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet) return;
    let active = true;
    setLoading(true);
    setError("");
    api
      .get<CreatorProfileShape>(`/creators/${wallet}/profile`)
      .then((profileResult) => {
        if (!active) return;
        const nextProfile = {
          ...emptyProfile(wallet),
          ...profileResult.data,
          wallet,
          socialLinks: {
            website: profileResult.data.socialLinks?.website ?? "",
            x: profileResult.data.socialLinks?.x ?? "",
          },
        };
        setProfile(nextProfile);
      })
      .catch(() => {
        if (active) setProfile(emptyProfile(wallet));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [wallet]);

  const publicUrl = useMemo(
    () => (profile.handle ? creatorPublicUrl(profile.handle) : ""),
    [profile.handle],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const handle = normalizeCreatorHandle(profile.handle);
    if (!profile.displayName.trim()) {
      setError("Add a display name before saving your creator profile.");
      return;
    }
    if (!profile.bio.trim()) {
      setError("Add a short bio before saving your creator profile.");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setError("Your profile URL needs 3–30 lowercase letters, numbers, or underscores.");
      return;
    }
    setSaving(true);
    try {
      const result = await api.put<CreatorProfileShape>(`/creators/${wallet}/profile`, {
        creatorWallet: wallet,
        handle,
        displayName: profile.displayName.trim(),
        bio: profile.bio.trim(),
        socialLinks: profile.socialLinks,
        featuredProductId: profile.featuredProductId || "",
        collections: profile.collections.map((collection, order) => ({
          title: collection.title.trim(),
          productIds: collection.productIds,
          order,
        })),
      });
      const saved = {
        ...result.data,
        wallet,
        socialLinks: {
          website: result.data.socialLinks?.website ?? "",
          x: result.data.socialLinks?.x ?? "",
        },
      };
      setProfile(saved);
      setNotice("Creator profile saved. Your public store is live.");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : "";
      setError(message || "Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!wallet) {
    return <div className="gum-page"><div className="gum-empty">Connect your wallet to manage your creator profile.</div></div>;
  }

  if (loading) {
    return (
      <div className="gum-page gum-page--wide">
        <div className="gum-profile-skeleton" aria-label="Loading creator profile">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      </div>
    );
  }

  return (
    <div className="gum-page gum-page--wide">
      <div className="gum-products-header">
        <div>
          <h1 className="gum-page__h1">Creator profile</h1>
          <p className="gum-page__lead">
            Build a public store that brings your products, story, and links together.
          </p>
        </div>
        {publicUrl ? (
          <a className="gum-btn gum-btn--outline" href={publicUrl} target="_blank" rel="noreferrer">
            View public profile
          </a>
        ) : null}
      </div>

      <form className="gum-profile-form" onSubmit={save} noValidate>
        <section className="gum-panel">
          <div className="gum-panel__head">
            <div>
              <div className="gum-panel__title">Profile basics</div>
              <div className="gum-panel__sub">This is what visitors see when they open your store.</div>
            </div>
          </div>
          <div className="gum-profile-grid">
            <div className="gum-field">
              <label className="gum-label" htmlFor="creator-display-name">Display name *</label>
              <input
                id="creator-display-name"
                className="gum-input"
                value={profile.displayName}
                onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                maxLength={80}
                autoComplete="name"
                placeholder="How buyers should know you"
                required
                aria-invalid={Boolean(error && !profile.displayName.trim())}
              />
            </div>
            <div className="gum-field">
              <label className="gum-label" htmlFor="creator-handle">Profile URL *</label>
              <div className="gum-handle-input">
                <span aria-hidden>@</span>
                <input
                  id="creator-handle"
                  value={profile.handle}
                  onChange={(event) => setProfile((current) => ({ ...current, handle: normalizeCreatorHandle(event.target.value) }))}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9_]{3,30}"
                  spellCheck={false}
                  autoComplete="username"
                  aria-describedby="creator-handle-hint"
                  placeholder="jhonsmith"
                  required
                />
              </div>
              <p className="gum-field__hint" id="creator-handle-hint">
                {publicUrl || "Use lowercase letters, numbers, and underscores."}
              </p>
            </div>
          </div>
          <div className="gum-field">
            <label className="gum-label" htmlFor="creator-bio">Bio *</label>
            <textarea
              id="creator-bio"
              className="gum-input gum-input--area"
              value={profile.bio}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
              maxLength={600}
              rows={4}
              placeholder="Tell buyers what you make and who it is for."
              aria-describedby="creator-bio-hint"
              required
              aria-invalid={Boolean(error && !profile.bio.trim())}
            />
            <p className="gum-field__hint" id="creator-bio-hint">{profile.bio.length}/600 characters</p>
          </div>
        </section>

        <section className="gum-panel">
          <div className="gum-panel__head">
            <div>
              <div className="gum-panel__title">Social links</div>
              <div className="gum-panel__sub">Optional — we recommend adding a social link so visitors can learn more and follow your work.</div>
            </div>
          </div>
          <div className="gum-profile-grid">
            {([
              ["website", "Website", "https://your-site.com"],
              ["x", "X profile", "https://x.com/yourhandle"],
            ] as const).map(([key, label, placeholder]) => (
              <div className="gum-field" key={key}>
                <label className="gum-label" htmlFor={`creator-${key}`}>{label} <span className="gum-label--dim">(optional)</span></label>
                <input
                  id={`creator-${key}`}
                  type="url"
                  inputMode="url"
                  className="gum-input"
                  value={profile.socialLinks[key] ?? ""}
                  onChange={(event) => setProfile((current) => ({
                    ...current,
                    socialLinks: { ...current.socialLinks, [key]: event.target.value },
                  }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </section>

        {error ? <div className="error" role="alert">{error}</div> : null}
        {notice ? <div className="notice" role="status">{notice}</div> : null}
        <div className="gum-panel__actions">
          <button className="gum-btn gum-btn--pink" type="submit" disabled={saving} aria-busy={saving}>
            {saving ? "Saving..." : "Save creator profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
