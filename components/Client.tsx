"use client";
import { useEffect, useState } from "react";
import { Download, ArrowUpRight, Aperture, Clock } from "lucide-react";
import { api, bytes } from "./api";
import Login from "./Login";
import Shell from "./Shell";
export default function Client() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [setup, setSetup] = useState(""),
    [setupDone, setSetupDone] = useState(false),
    [busy, setBusy] = useState(false),
    [album, setAlbum] = useState<any>(null),
    [photos, setPhotos] = useState<any[]>([]);
  const refresh = async () => {
    setLoading(true);
    try {
      setData(await api("client"));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("setup");
    if (token) {
      setSetup(token);
      window.history.replaceState({}, "", "/client");
      setLoading(false);
    } else void refresh();
  }, []);
  const logout = async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setData(null);
    setAlbum(null);
  };
  return (
    <Shell title="PRIVATE CLIENT GALLERIES" logout={data ? logout : undefined}>
      {loading ? (
        <div className="workspace">
          <p role="status">Opening your gallery…</p>
        </div>
      ) : setup && !setupDone ? (
        <div className="auth-shell">
          <p className="eyebrow">YOUR PRIVATE CHAPTER</p>
          <h1>MAKE IT YOURS.</h1>
          <form
            className="glass"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get("password") !== f.get("confirm")) {
                setError("Passwords do not match");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await api("setup", {
                  token: setup,
                  password: f.get("password"),
                });
                setSetupDone(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="muted">
              Set a password to open your assigned galleries. This access link
              can be used once.
            </p>
            <label htmlFor="new-password">
              New password · at least 12 characters
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button className="button gold" disabled={busy}>
                {busy ? "SETTING UP…" : "SET PASSWORD"}
                <ArrowUpRight size={17} />
              </button>
            </div>
          </form>
        </div>
      ) : !data ? (
        <>
          {setupDone && (
            <p
              className="success"
              style={{ maxWidth: 430, margin: "25px auto" }}
            >
              Your password is set. Sign in below.
            </p>
          )}
          <Login onSuccess={refresh} />
        </>
      ) : (
        <div className="workspace">
          <p className="eyebrow">WELCOME, {data.customer.name.toUpperCase()}</p>
          <h1>{album ? album.title.toUpperCase() : "YOUR CHAPTERS."}</h1>
          <p className="muted">
            A private collection, just for you. Downloaded files cannot be
            revoked after delivery.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {album ? (
            <>
              <div className="panel glass">
                <div className="album-header">
                  <div>
                    <p className="muted">
                      Session · {String(album.session_date).slice(0, 10)}\n
                      {album.count} photographs · Expires{" "}
                      {new Date(album.expires_at).toLocaleDateString("en-GB")}
                      \nComplete download · {bytes(Number(album.zip_bytes))}
                    </p>
                    <span className="badge" style={{ marginTop: 15 }}>
                      {album.state.toUpperCase()}
                    </span>
                  </div>
                  {album.state === "ready" ? (
                    <a
                      className="button gold"
                      href={`/api/client/${album.id}/download`}
                    >
                      <Download size={17} /> DOWNLOAD ALL PHOTOS
                    </a>
                  ) : (
                    <p className="muted">
                      {album.state === "failed"
                        ? "Your gallery could not be prepared. Please contact the studio."
                        : "Your previews and download are being prepared."}
                    </p>
                  )}
                </div>
                <div className="album-preview">
                  {photos.map((p) => (
                    <img
                      key={p.id}
                      src={`/api/client/${album.id}/preview/${p.id}`}
                      alt={p.alt || "Photograph in your private collection"}
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
              <button className="button" onClick={() => setAlbum(null)}>
                ALL YOUR CHAPTERS
              </button>
            </>
          ) : data.galleries.length ? (
            <div className="gallery-grid">
              {data.galleries.map((g: any) => (
                <article className="panel glass" key={g.id}>
                  <Aperture size={30} color="var(--gold)" />
                  <h2 style={{ margin: "20px 0" }}>{g.title}</h2>
                  <p className="muted">
                    {g.count} photographs\nSession ·{" "}
                    {String(g.session_date).slice(0, 10)}\nExpires ·{" "}
                    {new Date(g.expires_at).toLocaleDateString("en-GB")}
                  </p>
                  {g.expired ? (
                    <p className="error">
                      <Clock size={15} /> This gallery has expired. Contact the
                      studio for help.
                    </p>
                  ) : (
                    <button
                      className="button full"
                      style={{ marginTop: 25 }}
                      onClick={async () => {
                        setError("");
                        try {
                          const photos = await api(`client/${g.id}/photos`);
                          setPhotos(photos);
                          setAlbum(g);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      OPEN CHAPTER
                      <ArrowUpRight size={16} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              No active galleries are assigned to this account. Contact the
              studio if you expected a collection.
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
