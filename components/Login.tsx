"use client";
import { useState } from "react";
import { Aperture, ArrowUpRight } from "lucide-react";
export default function Login({
  admin = false,
  onSuccess,
}: {
  admin?: boolean;
  onSuccess: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="auth-shell">
      <p className="eyebrow">
        {admin ? "STUDIO ACCESS" : "YOUR PRIVATE COLLECTION"}
      </p>
      <h1>
        {admin ? "BEHIND THE\nCHAPTERS." : "YOUR CHAPTER,\nREADY TO KEEP."}
      </h1>
      <p className="muted">
        {admin
          ? "Sign in to manage your studio. Admin accounts are provisioned privately."
          : "Sign in with the email and password you set up from the studio’s access email."}
      </p>
      <form
        className="glass"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          let email = String(f.get("email") || "").trim();
          if (email && !email.includes("@")) {
            email = `${email}@example.com`;
          }
          try {
            const r = await fetch("/api/auth/sign-in/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                password: f.get("password"),
              }),
            });
            if (!r.ok)
              throw new Error(
                "Unable to sign in. Check your details or request a new access link.",
              );
            onSuccess();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Aperture size={25} color="var(--gold)" />
        <label htmlFor="email">Username or email</label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
            {busy ? "SIGNING IN…" : "SIGN IN"}
            <ArrowUpRight size={17} />
          </button>
        </div>
      </form>
      <p className="muted">
        {admin
          ? "No public registration is available."
          : "Gallery access is personal and may expire. Contact the studio if you need a new access link."}
      </p>
    </div>
  );
}
