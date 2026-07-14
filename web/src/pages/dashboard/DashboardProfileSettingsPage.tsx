import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "../../lib/api";
import { creatorPublicUrl, normalizeCreatorHandle } from "../../lib/creatorUtils";
import type { CreatorCollection, CreatorProfileShape } from "../../types/creator";
import type { ProductShape } from "../../types/product";

type EditableCollection = CreatorCollection & { clientId: string };

const emptyProfile = (wallet: string): CreatorProfileShape => ({
  wallet,
  handle: "",
  displayName: "",
  bio: "",
  socialLinks: { website: "", x: "", discord: "" },
  featuredProductId: "",
  collections: [],
});

function toEditableCollections(collections: CreatorCollection[] = []): EditableCollection[] {
  return collections.map((collection, index) => ({
    ...collection,
    clientId: collection._id || `${Date.now()}-${index}`,
  }));
}

export function DashboardProfileSettingsPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [profile, setProfile] = useState<CreatorProfileShape>(() => emptyProfile(""));
  const [products, setProducts] = useState<ProductShape[]>([]);
  const [collections, setCollections] = useState<EditableCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.get<CreatorProfileShape>(`/creators/${wallet}/profile`),
      api.get<ProductShape[]>(`/products/creator/${wallet}`),
    ])
      .then(([profileResult, productsResult]) => {
        if (!active) return;
        const nextProfile = {
          ...emptyProfile(wallet),
          ...profileResult.data,
          wallet,
          socialLinks: {
            website: profileResult.data.socialLinks?.website ?? "",
            x: profileResult.data.socialLinks?.x ?? "",
            discord: profileResult.data.socialLinks?.discord ?? "",
          },
        };
        setProfile(nextProfile);
        setCollections(toEditableCollections(nextProfile.collections));
        setProducts(Array.isArray(productsResult.data) ? productsResult.data : []);
      })
      .catch(() => {
        if (active) setError("Could not load your creator profile. Refresh and try again.");
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

  const updateCollection = (clientId: string, update: Partial<EditableCollection>) => {
    setCollections((current) =>
      current.map((collection) =>
        collection.clientId === clientId ? { ...collection, ...update } : collection,
      ),
    );
  };

  const toggleCollectionProduct = (clientId: string, productId: string) => {
    setCollections((current) =>
      current.map((collection) => {
        if (collection.clientId !== clientId) return collection;
        const productIds = collection.productIds.includes(productId)
          ? collection.productIds.filter((id) => id !== productId)
          : [...collection.productIds, productId];
        return { ...collection, productIds };
      }),
    );
  };

  const addCollection = () => {
    setCollections((current) => [
      ...current,
      {
        clientId: `${Date.now()}-${current.length}`,
        title: "",
        productIds: [],
        order: current.length,
      },
    ]);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const handle = normalizeCreatorHandle(profile.handle);
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
      setError("Your profile URL needs 3–30 lowercase letters, numbers, or underscores.");
      return;
    }
    if (collections.some((collection) => !collection.title.trim())) {
      setError("Give every collection a title or remove it.");
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
        collections: collections.map((collection, order) => ({
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
          discord: result.data.socialLinks?.discord ?? "",
        },
      };
      setProfile(saved);
      setCollections(toEditableCollections(saved.collections));
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

      <form onSubmit={save} noValidate>
        <section className="gum-panel">
          <div className="gum-panel__head">
            <div>
              <div className="gum-panel__title">Profile basics</div>
              <div className="gum-panel__sub">This is what visitors see when they open your store.</div>
            </div>
          </div>
          <div className="gum-profile-grid">
            <div className="gum-field">
              <label className="gum-label" htmlFor="creator-display-name">Display name</label>
              <input
                id="creator-display-name"
                className="gum-input"
                value={profile.displayName}
                onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                maxLength={80}
                autoComplete="name"
                placeholder="How buyers should know you"
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
                  placeholder="sachin"
                  required
                />
              </div>
              <p className="gum-field__hint" id="creator-handle-hint">
                {publicUrl || "Use lowercase letters, numbers, and underscores."}
              </p>
            </div>
          </div>
          <div className="gum-field">
            <label className="gum-label" htmlFor="creator-bio">Bio</label>
            <textarea
              id="creator-bio"
              className="gum-input gum-input--area"
              value={profile.bio}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
              maxLength={600}
              rows={4}
              placeholder="Tell buyers what you make and who it is for."
              aria-describedby="creator-bio-hint"
            />
            <p className="gum-field__hint" id="creator-bio-hint">{profile.bio.length}/600 characters</p>
          </div>
        </section>

        <section className="gum-panel">
          <div className="gum-panel__head">
            <div>
              <div className="gum-panel__title">Social links</div>
              <div className="gum-panel__sub">Give visitors a way to learn more and follow your work.</div>
            </div>
          </div>
          <div className="gum-profile-grid">
            {([
              ["website", "Website", "https://your-site.com"],
              ["x", "X profile", "https://x.com/yourhandle"],
              ["discord", "Discord invite", "https://discord.gg/your-community"],
            ] as const).map(([key, label, placeholder]) => (
              <div className="gum-field" key={key}>
                <label className="gum-label" htmlFor={`creator-${key}`}>{label}</label>
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

        <section className="gum-panel">
          <div className="gum-panel__head">
            <div>
              <div className="gum-panel__title">Storefront</div>
              <div className="gum-panel__sub">Feature one product and arrange the rest into collections.</div>
            </div>
          </div>
          <div className="gum-field">
            <label className="gum-label" htmlFor="featured-product">Featured product</label>
            <select
              id="featured-product"
              className="gum-input"
              value={profile.featuredProductId ?? ""}
              onChange={(event) => setProfile((current) => ({ ...current, featuredProductId: event.target.value }))}
            >
              <option value="">No featured product</option>
              {products.filter((product) => product.status === "published").map((product) => (
                <option key={product._id} value={product._id}>{product.title}</option>
              ))}
            </select>
          </div>

          <div className="gum-collections">
            <div className="gum-collections__head">
              <div>
                <div className="gum-label">Collections</div>
                <p className="gum-field__hint">Group related products to make your store easier to browse.</p>
              </div>
              <button className="gum-btn gum-btn--outline" type="button" onClick={addCollection}>Add collection</button>
            </div>
            {collections.length === 0 ? (
              <p className="gum-empty gum-empty--inline">No collections yet. Add one when you have related products.</p>
            ) : (
              collections.map((collection) => (
                <fieldset className="gum-collection-editor" key={collection.clientId}>
                  <legend>Collection</legend>
                  <div className="gum-collection-editor__head">
                    <input
                      className="gum-input"
                      value={collection.title}
                      onChange={(event) => updateCollection(collection.clientId, { title: event.target.value })}
                      placeholder="For example: Design resources"
                      maxLength={80}
                      aria-label="Collection title"
                    />
                    <button
                      className="gum-text-button"
                      type="button"
                      onClick={() => setCollections((current) => current.filter((item) => item.clientId !== collection.clientId))}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="gum-collection-products">
                    {products.length === 0 ? (
                      <p className="gum-field__hint">Create a product first, then add it to a collection.</p>
                    ) : products.map((product) => (
                      <label className="gum-check" key={product._id}>
                        <input
                          type="checkbox"
                          checked={collection.productIds.includes(product._id)}
                          onChange={() => toggleCollectionProduct(collection.clientId, product._id)}
                        />
                        <span>{product.title}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            )}
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
