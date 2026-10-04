"use client";
import { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import {
  Aperture,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Save,
  Eye,
  Upload,
  Trash2,
  Check,
  RefreshCw,
} from "lucide-react";
import { Content } from "@/lib/content";
import { api, bytes, money } from "./api";
import Login from "./Login";
import Shell from "./Shell";
function tabKeys(
  e: React.KeyboardEvent<HTMLDivElement>,
  labels: string[],
  current: string,
  set: (v: string) => void,
) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const index =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? labels.length - 1
        : (labels.indexOf(current) +
            (e.key === "ArrowRight" ? 1 : -1) +
            labels.length) %
          labels.length;
  set(labels[index]);
  (
    e.currentTarget.querySelectorAll("[role=tab]")[index] as HTMLElement
  )?.focus();
}
const tabs = [
  "Overview",
  "Website Content",
  "Media",
  "Bookings",
  "Availability",
  "Clients & Galleries",
  "Email Inbox",
  "Audit",
];
function Field({
  label,
  value,
  onChange,
  type = "text",
  area = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function UploadForm({
  scope,
  galleryId,
  onDone,
}: {
  scope: "public" | "client";
  galleryId?: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        form.set("scope", scope);
        if (galleryId) form.set("galleryId", galleryId);
        setError("");
        setProgress(0);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onerror = () => {
          setError("Upload connection failed");
          setProgress(null);
        };
        xhr.onload = () => {
          setProgress(null);
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 400) throw new Error(data.error);
            onDone();
          } catch (e) {
            setError((e as Error).message);
          }
        };
        xhr.send(form);
      }}
    >
      <label>
        Photograph · JPEG / PNG / WebP · maximum 25 MB
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={progress !== null}
        />
      </label>
      <label>
        Descriptive alternative text
        <input name="alt" required={scope === "public"} maxLength={1000} />
      </label>
      {progress !== null && (
        <>
          <progress
            max={100}
            value={progress}
            aria-label="Upload progress"
            style={{ width: "100%" }}
          />
          <p className="muted" role="status">
            {progress < 100
              ? `Uploading · ${progress}%`
              : "Upload received · validating and processing…"}
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="button small"
        disabled={progress !== null}
        style={{ marginTop: 15 }}
      >
        <Upload size={15} /> UPLOAD PHOTOGRAPH
      </button>
    </form>
  );
}
function MediaPlacement({
  label,
  placement,
  assets,
  onChange,
}: {
  label: string;
  placement: any;
  assets: any[];
  onChange: (p: any) => void;
}) {
  return (
    <div className="record">
      <label>
        {label}
        <select
          value={placement?.id || ""}
          onChange={(e) => {
            const a = assets.find((a) => a.id === e.target.value);
            onChange(
              a ? { id: a.id, alt: a.alt, desktop: 50, mobile: 50 } : null,
            );
          }}
        >
          <option value="">No photograph</option>
          {assets
            .filter((a) => a.status === "ready")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.filename} · {a.alt.slice(0, 40)}
              </option>
            ))}
        </select>
      </label>
      {placement && (
        <>
          <img
            src={`/api/media/${placement.id}?draft=1&w=400`}
            alt={placement.alt}
            style={{
              width: "100%",
              height: 140,
              objectFit: "cover",
              objectPosition: placement.desktop + "% center",
            }}
          />
          <Field
            label="Alternative text"
            value={placement.alt}
            onChange={(alt) => onChange({ ...placement, alt })}
          />
          <label>
            Desktop focal point · {placement.desktop}%
            <input
              type="range"
              min={0}
              max={100}
              value={placement.desktop}
              onChange={(e) =>
                onChange({ ...placement, desktop: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Mobile focal point · {placement.mobile}%
            <input
              type="range"
              min={0}
              max={100}
              value={placement.mobile}
              onChange={(e) =>
                onChange({ ...placement, mobile: Number(e.target.value) })
              }
            />
          </label>
        </>
      )}
    </div>
  );
}
function ContentEditor({
  content,
  assets,
  onSaved,
  notify,
}: {
  content: Content;
  assets: any[];
  onSaved: () => void;
  notify: (message: string, error?: boolean) => void;
}) {
  const [c, setC] = useState(content),
    [busy, setBusy] = useState(false),
    [section, setSection] = useState("Identity & Copy");
  useEffect(() => setC(content), [content]);
  const set = (field: keyof Content, value: any) =>
    setC({ ...c, [field]: value });
  const action = async (publish = false) => {
    setBusy(true);
    try {
      await api("admin/content", c);
      if (publish) await api("admin/publish", {});
      notify(
        publish
          ? "Published. The public page now uses this content."
          : "Draft saved. The public page has not changed.",
      );
      onSaved();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="toolbar">
        <button
          className="button small"
          disabled={busy}
          onClick={() => action()}
        >
          <Save size={14} /> SAVE DRAFT
        </button>
        <a className="button small" href="/preview" target="_blank">
          <Eye size={14} /> PREVIEW SAVED DRAFT
        </a>
        <button
          className="button small gold"
          disabled={busy}
          onClick={() => action(true)}
        >
          <Check size={14} /> SAVE & PUBLISH
        </button>
      </div>
      <p className="muted" style={{ marginTop: 15 }}>
        Edit → save draft → preview → publish. Replacing a placement keeps the
        published photograph until publication.
      </p>
      <div className="tabs" role="tablist" aria-label="Content editing areas">
        {[
          "Identity & Copy",
          "Team",
          "Packages",
          "Image Placements",
          "Reviews & FAQs",
        ].map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={s === section}
            className={s === section ? "active" : ""}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="panel glass">
        {section === "Identity & Copy" ? (
          <>
            <h2>MAKE IT YOURS.</h2>
            <Toggle
              label="Show development sample-media and demo-price notices"
              value={c.demo}
              onChange={(v) => set("demo", v)}
            />
            <div className="form-grid">
              <Field
                label="Brand name"
                value={c.brand}
                onChange={(v) => set("brand", v)}
              />
              <Field
                label="Logo monogram"
                value={c.logo}
                onChange={(v) => set("logo", v)}
              />
            </div>
            <Field
              label="Hero headline · one line per row"
              value={c.headline}
              onChange={(v) => set("headline", v)}
              area
            />
            <Field
              label="Supporting copy"
              value={c.description}
              onChange={(v) => set("description", v)}
              area
            />
            <div className="form-grid">
              <Field
                label="Contact email"
                value={c.email}
                onChange={(v) => set("email", v)}
                type="email"
              />
              <Field
                label="Contact phone"
                value={c.phone}
                onChange={(v) => set("phone", v)}
              />
            </div>
            <Field
              label="Location / contact address"
              value={c.address}
              onChange={(v) => set("address", v)}
            />
            <Field
              label="Gallery delivery wording"
              value={c.deliveryCopy}
              onChange={(v) => set("deliveryCopy", v)}
              area
            />
            <h3 style={{ marginTop: 25 }}>SECTION HEADLINES & COPY</h3>
            {Object.entries(c.copy).map(([key, value]) => (
              <Field
                key={key}
                label={key.replace(/([A-Z])/g, " $1")}
                value={value}
                area
                onChange={(v) => set("copy", { ...c.copy, [key]: v })}
              />
            ))}
            <h3 style={{ marginTop: 25 }}>SOCIAL LINKS</h3>
            {c.socials.map((s, n) => (
              <div className="record" key={n}>
                <Field
                  label="Label"
                  value={s.label}
                  onChange={(v) =>
                    set(
                      "socials",
                      c.socials.map((s, i) =>
                        i === n ? { ...s, label: v } : s,
                      ),
                    )
                  }
                />
                <Field
                  label="HTTPS URL"
                  value={s.url}
                  onChange={(v) =>
                    set(
                      "socials",
                      c.socials.map((s, i) => (i === n ? { ...s, url: v } : s)),
                    )
                  }
                />
                <button
                  className="button small"
                  onClick={() =>
                    set(
                      "socials",
                      c.socials.filter((_, i) => i !== n),
                    )
                  }
                >
                  REMOVE LINK
                </button>
              </div>
            ))}
            <button
              className="button small"
              onClick={() =>
                set("socials", [
                  ...c.socials,
                  { label: "Social profile", url: "https://example.com" },
                ])
              }
            >
              <Plus size={14} /> ADD SOCIAL LINK
            </button>
          </>
        ) : section === "Team" ? (
          <>
            <h2>BEHIND THE LENS.</h2>
            <Field
              label="Central quotation"
              value={c.teamQuote}
              onChange={(v) => set("teamQuote", v)}
              area
            />
            {c.team.map((t, n) => (
              <div className="record" key={n}>
                <h3>PHOTOGRAPHER {n + 1}</h3>
                <Field
                  label="Display name"
                  value={t.name}
                  onChange={(v) =>
                    set(
                      "team",
                      c.team.map((t, i) => (i === n ? { ...t, name: v } : t)),
                    )
                  }
                />
                <Field
                  label="Role"
                  value={t.role}
                  onChange={(v) =>
                    set(
                      "team",
                      c.team.map((t, i) => (i === n ? { ...t, role: v } : t)),
                    )
                  }
                />
                <Toggle
                  label="Placeholder identity and portrait notice"
                  value={t.sample}
                  onChange={(v) =>
                    set(
                      "team",
                      c.team.map((t, i) => (i === n ? { ...t, sample: v } : t)),
                    )
                  }
                />
                <MediaPlacement
                  label="Team portrait"
                  placement={t.portrait}
                  assets={assets}
                  onChange={(v) =>
                    set(
                      "team",
                      c.team.map((t, i) =>
                        i === n ? { ...t, portrait: v } : t,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </>
        ) : section === "Packages" ? (
          <>
            <h2>TIME FOR A CHAPTER.</h2>
            <Toggle
              label="Show packages section, navigation and public booking actions"
              value={c.packagesVisible}
              onChange={(v) => set("packagesVisible", v)}
            />
            <p className="muted">
              Archived and removed packages retain their original snapshots in
              historical bookings. Full Day has an explicit duration in minutes.
            </p>
            {c.packages.map((p, n) => (
              <div className="record" key={p.id}>
                <div className="record-heading">
                  <h3>{p.name.toUpperCase()}</h3>
                  <div className="toolbar">
                    <button
                      className="icon"
                      disabled={n === 0}
                      aria-label="Move package up"
                      onClick={() => {
                        const ps = [...c.packages];
                        [ps[n - 1], ps[n]] = [ps[n], ps[n - 1]];
                        set("packages", ps);
                      }}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon"
                      disabled={n === c.packages.length - 1}
                      aria-label="Move package down"
                      onClick={() => {
                        const ps = [...c.packages];
                        [ps[n + 1], ps[n]] = [ps[n], ps[n + 1]];
                        set("packages", ps);
                      }}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
                {[
                  ["Name", "name"],
                  ["Price · integer pence", "price"],
                  ["Duration · minutes", "duration"],
                  ["Edited-photo allowance", "allowance"],
                ].map(([label, key]) => (
                  <Field
                    key={key}
                    label={label}
                    type={key === "name" ? "text" : "number"}
                    value={(p as any)[key]}
                    onChange={(v) =>
                      set(
                        "packages",
                        c.packages.map((p, i) =>
                          i === n
                            ? { ...p, [key]: key === "name" ? v : Number(v) }
                            : p,
                        ),
                      )
                    }
                  />
                ))}
                <Field
                  label="Description"
                  value={p.description}
                  onChange={(v) =>
                    set(
                      "packages",
                      c.packages.map((p, i) =>
                        i === n ? { ...p, description: v } : p,
                      ),
                    )
                  }
                />
                <Field
                  label="Inclusions · one per line"
                  value={p.inclusions.join("\n")}
                  onChange={(v) =>
                    set(
                      "packages",
                      c.packages.map((p, i) =>
                        i === n ? { ...p, inclusions: v.split("\n") } : p,
                      ),
                    )
                  }
                  area
                />
                <Field
                  label="Delivery estimate"
                  value={p.delivery}
                  onChange={(v) =>
                    set(
                      "packages",
                      c.packages.map((p, i) =>
                        i === n ? { ...p, delivery: v } : p,
                      ),
                    )
                  }
                />
                <label>
                  Optional background
                  <select
                    value={p.image || ""}
                    onChange={(e) =>
                      set(
                        "packages",
                        c.packages.map((p, i) =>
                          i === n ? { ...p, image: e.target.value || null } : p,
                        ),
                      )
                    }
                  >
                    <option value="">None</option>
                    {assets
                      .filter((a) => a.status === "ready")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.filename}
                        </option>
                      ))}
                  </select>
                </label>
                {[
                  ["Publicly visible", "visible"],
                  ["Accepting new requests", "accepting"],
                  ["Archived", "archived"],
                ].map(([label, key]) => (
                  <Toggle
                    key={key}
                    label={label}
                    value={(p as any)[key]}
                    onChange={(v) =>
                      set(
                        "packages",
                        c.packages.map((p, i) =>
                          i === n ? { ...p, [key]: v } : p,
                        ),
                      )
                    }
                  />
                ))}
                <button
                  className="button small"
                  onClick={() =>
                    set(
                      "packages",
                      c.packages.filter((_, i) => i !== n),
                    )
                  }
                >
                  REMOVE FROM DRAFT
                </button>
              </div>
            ))}
            <button
              className="button small"
              onClick={() =>
                set("packages", [
                  ...c.packages,
                  {
                    id: crypto.randomUUID(),
                    name: "6 Hours",
                    price: 0,
                    duration: 360,
                    description: "",
                    inclusions: [],
                    allowance: 0,
                    delivery: "To be agreed",
                    visible: false,
                    accepting: false,
                    archived: false,
                  },
                ])
              }
            >
              <Plus size={14} /> ADD DURATION PACKAGE
            </button>
          </>
        ) : section === "Image Placements" ? (
          <>
            <h2>THE FRAMES ON YOUR WEBSITE.</h2>
            <p className="muted">
              Upload new photographs in Media. Assign ready assets here.
              Removing a placement does not delete its underlying file.
            </p>
            {(["hero", "wall"] as const).map((key) => (
              <div className="editor-section" key={key}>
                <h3>
                  {key === "hero" ? "HERO SLIDESHOW" : "AUTOMATIC PHOTO WALL"}
                </h3>
                {c[key].map((p, n) => (
                  <div key={n}>
                    <MediaPlacement
                      label={`Photograph ${n + 1}`}
                      placement={p}
                      assets={assets}
                      onChange={(v) =>
                        set(
                          key,
                          v
                            ? c[key].map((p, i) => (i === n ? v : p))
                            : c[key].filter((_, i) => i !== n),
                        )
                      }
                    />
                    <div className="toolbar">
                      <button
                        className="button small"
                        onClick={() =>
                          set(
                            key,
                            c[key].filter((_, i) => i !== n),
                          )
                        }
                      >
                        REMOVE PLACEMENT
                      </button>
                      <button
                        className="icon"
                        aria-label="Move image up"
                        disabled={n === 0}
                        onClick={() => {
                          const list = [...c[key]];
                          [list[n], list[n - 1]] = [list[n - 1], list[n]];
                          set(key, list);
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon"
                        aria-label="Move image down"
                        disabled={n === c[key].length - 1}
                        onClick={() => {
                          const list = [...c[key]];
                          [list[n], list[n + 1]] = [list[n + 1], list[n]];
                          set(key, list);
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="button small"
                  style={{ marginTop: 20 }}
                  disabled={!assets.some((a) => a.status === "ready")}
                  onClick={() => {
                    const a = assets.find((a) => a.status === "ready");
                    set(key, [
                      ...c[key],
                      { id: a.id, alt: a.alt, desktop: 50, mobile: 50 },
                    ]);
                  }}
                >
                  <Plus size={14} /> ADD PLACEMENT
                </button>
              </div>
            ))}
          </>
        ) : (
          <>
            <h2>WORDS THAT MATTER.</h2>
            <Toggle
              label="Show reviews section and navigation"
              value={c.reviewsVisible}
              onChange={(v) => set("reviewsVisible", v)}
            />
            {c.reviews.map((r, n) => (
              <div className="record" key={n}>
                <Field
                  label="Review quotation"
                  value={r.quote}
                  onChange={(v) =>
                    set(
                      "reviews",
                      c.reviews.map((r, i) =>
                        i === n ? { ...r, quote: v } : r,
                      ),
                    )
                  }
                  area
                />
                <Field
                  label="Display name / attribution"
                  value={r.name}
                  onChange={(v) =>
                    set(
                      "reviews",
                      c.reviews.map((r, i) =>
                        i === n ? { ...r, name: v } : r,
                      ),
                    )
                  }
                />
                <Toggle
                  label="Sample / fictional content (must remain labelled)"
                  value={r.sample}
                  onChange={(v) =>
                    set(
                      "reviews",
                      c.reviews.map((r, i) =>
                        i === n ? { ...r, sample: v } : r,
                      ),
                    )
                  }
                />
                <button
                  className="button small"
                  onClick={() =>
                    set(
                      "reviews",
                      c.reviews.filter((_, i) => i !== n),
                    )
                  }
                >
                  REMOVE REVIEW
                </button>
              </div>
            ))}
            <button
              className="button small"
              onClick={() =>
                set("reviews", [
                  ...c.reviews,
                  {
                    quote: "Sample quotation",
                    name: "Sample content",
                    sample: true,
                  },
                ])
              }
            >
              ADD REVIEW
            </button>
            <h3 style={{ marginTop: 40 }}>FREQUENTLY ASKED QUESTIONS</h3>
            {c.faqs.map((f, n) => (
              <div className="record" key={n}>
                <Field
                  label="Question"
                  value={f.question}
                  onChange={(v) =>
                    set(
                      "faqs",
                      c.faqs.map((f, i) =>
                        i === n ? { ...f, question: v } : f,
                      ),
                    )
                  }
                />
                <Field
                  label="Answer"
                  value={f.answer}
                  onChange={(v) =>
                    set(
                      "faqs",
                      c.faqs.map((f, i) => (i === n ? { ...f, answer: v } : f)),
                    )
                  }
                  area
                />
                <button
                  className="button small"
                  onClick={() =>
                    set(
                      "faqs",
                      c.faqs.filter((_, i) => i !== n),
                    )
                  }
                >
                  REMOVE FAQ
                </button>
              </div>
            ))}
            <button
              className="button small"
              onClick={() =>
                set("faqs", [
                  ...c.faqs,
                  { question: "New question", answer: "" },
                ])
              }
            >
              ADD FAQ
            </button>
          </>
        )}
      </div>
    </>
  );
}
function AvailabilityEditor({
  settings,
  setSettings,
  save,
  busy,
}: {
  settings: string;
  setSettings: (v: string) => void;
  save: () => void;
  busy: boolean;
}) {
  let cfg: any;
  try {
    cfg = JSON.parse(settings);
  } catch {}
  const update = (next: any) => setSettings(JSON.stringify(next, null, 2));
  return (
    <>
      <h2>ONE RESOURCE. TWO PHOTOGRAPHERS.</h2>
      <p className="muted" style={{ marginTop: 20 }}>
        All working times use Europe/London. Changes are checked against active
        bookings and buffers before saving.
      </p>
      {cfg && (
        <>
          <h3 style={{ marginTop: 30 }}>WEEKLY WORKING HOURS</h3>
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day, n) => {
            const key = String(n + 1),
              hours = cfg.weekly[key];
            return (
              <div className="record" key={day}>
                <Toggle
                  label={day + " · open for sessions"}
                  value={Boolean(hours)}
                  onChange={(v) =>
                    update({
                      ...cfg,
                      weekly: {
                        ...cfg.weekly,
                        [key]: v ? ["09:00", "19:00"] : null,
                      },
                    })
                  }
                />
                {hours && (
                  <div className="form-grid">
                    <Field
                      label={day + " opens"}
                      type="time"
                      value={hours[0]}
                      onChange={(v) =>
                        update({
                          ...cfg,
                          weekly: { ...cfg.weekly, [key]: [v, hours[1]] },
                        })
                      }
                    />
                    <Field
                      label={day + " closes"}
                      type="time"
                      value={hours[1]}
                      onChange={(v) =>
                        update({
                          ...cfg,
                          weekly: { ...cfg.weekly, [key]: [hours[0], v] },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div className="form-grid">
            {[
              ["Setup / travel buffer · minutes", "buffer"],
              ["Minimum notice · hours", "noticeHours"],
              ["Booking horizon · days", "horizonDays"],
              ["Pending request expiry · hours", "pendingHours"],
            ].map(([label, key]) => (
              <Field
                key={key}
                label={label}
                type="number"
                value={cfg[key]}
                onChange={(v) => update({ ...cfg, [key]: Number(v) })}
              />
            ))}
          </div>
          <h3 style={{ marginTop: 35 }}>DATE-SPECIFIC OVERRIDES</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                date = String(f.get("date"));
              update({
                ...cfg,
                overrides: {
                  ...cfg.overrides,
                  [date]: f.get("closed")
                    ? null
                    : [String(f.get("open")), String(f.get("close"))],
                },
              });
            }}
          >
            <div className="form-grid">
              <label>
                Date
                <input name="date" type="date" required />
              </label>
              <label className="checkbox">
                <input name="closed" type="checkbox" />
                Closed for the whole day
              </label>
              <label>
                Opens
                <input type="time" name="open" defaultValue="09:00" required />
              </label>
              <label>
                Closes
                <input type="time" name="close" defaultValue="19:00" required />
              </label>
            </div>
            <button className="button small" style={{ marginTop: 15 }}>
              ADD OVERRIDE TO DRAFT
            </button>
          </form>
          {Object.entries(cfg.overrides).map(([date, hours]: any) => (
            <div className="record record-heading" key={date}>
              <p>
                {date} · {hours ? hours.join(" – ") : "Closed all day"}
              </p>
              <button
                className="button small"
                onClick={() => {
                  const overrides = { ...cfg.overrides };
                  delete overrides[date];
                  update({ ...cfg, overrides });
                }}
              >
                REMOVE
              </button>
            </div>
          ))}
          <h3 style={{ marginTop: 35 }}>BLOCKED PERIODS</h3>
          <p className="muted">
            Use midnight to midnight for a full-day block, or select a
            partial-day range. Saved blocks never expose their internal labels
            publicly.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update({
                ...cfg,
                blocks: [
                  ...cfg.blocks,
                  {
                    start: DateTime.fromISO(String(f.get("start")), {
                      zone: "Europe/London",
                    })
                      .toUTC()
                      .toISO(),
                    end: DateTime.fromISO(String(f.get("end")), {
                      zone: "Europe/London",
                    })
                      .toUTC()
                      .toISO(),
                    label: String(f.get("label")),
                  },
                ],
              });
            }}
          >
            <label>
              Internal block label
              <input name="label" required maxLength={80} />
            </label>
            <div className="form-grid">
              <label>
                Block starts · Europe/London
                <input name="start" type="datetime-local" required />
              </label>
              <label>
                Block ends · Europe/London
                <input name="end" type="datetime-local" required />
              </label>
            </div>
            <button className="button small" style={{ marginTop: 15 }}>
              ADD BLOCK TO DRAFT
            </button>
          </form>
          {cfg.blocks.map((b: any, n: number) => (
            <div className="record record-heading" key={n}>
              <p>
                {b.label} ·{" "}
                {DateTime.fromISO(b.start)
                  .setZone("Europe/London")
                  .toFormat("d LLL HH:mm")}{" "}
                –{" "}
                {DateTime.fromISO(b.end)
                  .setZone("Europe/London")
                  .toFormat("d LLL HH:mm")}
              </p>
              <button
                className="button small"
                onClick={() =>
                  update({
                    ...cfg,
                    blocks: cfg.blocks.filter((_: any, i: number) => i !== n),
                  })
                }
              >
                REMOVE
              </button>
            </div>
          ))}
        </>
      )}
      <details style={{ margin: "25px 0" }}>
        <summary>Advanced JSON configuration</summary>
        <label>
          Availability configuration
          <textarea
            className="json-editor"
            value={settings}
            onChange={(e) => setSettings(e.target.value)}
          />
        </label>
      </details>
      <button className="button gold" disabled={busy} onClick={save}>
        SAVE AVAILABILITY
        <Save size={16} />
      </button>
    </>
  );
}
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("Overview"),
    [health, setHealth] = useState<any>(null),
    [content, setContent] = useState<Content | null>(null),
    [assets, setAssets] = useState<any[]>([]),
    [bookings, setBookings] = useState<any[]>([]),
    [customers, setCustomers] = useState<any[]>([]),
    [galleries, setGalleries] = useState<any[]>([]),
    [inbox, setInbox] = useState<any[]>([]),
    [events, setEvents] = useState<any[]>([]),
    [jobs, setJobs] = useState<any[]>([]),
    [settings, setSettings] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [selectedEmail, setSelectedEmail] = useState<any>(null),
    [deleteTarget, setDeleteTarget] = useState<any>(null),
    [deleteText, setDeleteText] = useState(""),
    [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!deleteTarget) return;
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteTarget(null);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input",
        ) || [],
      );
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [deleteTarget]);
  const notify = (message: string, error = false) => {
    if (error) {
      setError(message);
      setMessage("");
    } else {
      setMessage(message);
      setError("");
    }
  };
  const refresh = async () => {
    try {
      const h = await api("admin/health");
      setHealth(h);
      setAuthenticated(true);
      const all = await Promise.all([
        api("admin/content"),
        api("admin/media"),
        api("admin/bookings"),
        api("admin/customers"),
        api("admin/galleries"),
        api("admin/inbox"),
        api("admin/audit"),
        api("admin/settings"),
        api("admin/jobs"),
      ]);
      setContent(all[0]);
      setAssets(all[1]);
      setBookings(all[2]);
      setCustomers(all[3]);
      setGalleries(all[4]);
      setInbox(all[5]);
      setEvents(all[6]);
      setSettings(JSON.stringify(all[7], null, 2));
      setJobs(all[8]);
    } catch (e) {
      if (!authenticated) setAuthenticated(false);
      else notify((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const mutate = async (path: string, body: any, success: string) => {
    setBusy(true);
    try {
      await api("admin/" + path, body);
      notify(success);
      await refresh();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setAuthenticated(false);
  };
  return (
    <Shell
      title="STUDIO ADMINISTRATION"
      logout={authenticated ? logout : undefined}
    >
      {loading ? (
        <div className="workspace">
          <p role="status">Opening the studio…</p>
        </div>
      ) : !authenticated ? (
        <Login admin onSuccess={refresh} />
      ) : (
        <div className="workspace">
          <div className="record-heading">
            <div>
              <p className="eyebrow">BEHIND EVERY CHAPTER</p>
              <h1>THE STUDIO.</h1>
              <p className="muted">
                Content, requests and private collections. One place.
              </p>
            </div>
            <button className="button small" onClick={refresh}>
              <RefreshCw size={14} /> REFRESH
            </button>
          </div>
          <div
            className="tabs"
            role="tablist"
            aria-label="Admin areas"
            onKeyDown={(e) => tabKeys(e, tabs, tab, setTab)}
          >
            {tabs.map((t) => (
              <button
                role="tab"
                tabIndex={tab === t ? 0 : -1}
                aria-selected={tab === t}
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => {
                  setTab(t);
                  setError("");
                  setMessage("");
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          {tab === "Overview" && health ? (
            <>
              <div className="stats">
                {[
                  [
                    "PENDING REQUESTS",
                    String(
                      bookings.filter((b) => b.state === "pending").length,
                    ),
                  ],
                  [
                    "ACTIVE GALLERIES",
                    String(
                      galleries.filter(
                        (g) => !g.revoked && g.state !== "deleted",
                      ).length,
                    ),
                  ],
                  ["STORAGE USED", bytes(health.usage.used)],
                  ["REMAINING", bytes(health.usage.remaining)],
                ].map(([label, value]) => (
                  <div className="stat glass" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="panel glass">
                <h2>INTEGRATION HEALTH.</h2>
                {[
                  ["Database", health.database],
                  ["Storage", health.storage],
                  ["Email", health.email],
                  ["Telegram chat", health.telegram],
                  [
                    "Background worker",
                    health.worker &&
                    Date.now() - Date.parse(health.worker) < 30000
                      ? "Running · recent heartbeat"
                      : "No recent heartbeat · start npm run worker",
                  ],
                ].map(([label, value]) => (
                  <div className="record record-heading" key={label}>
                    <p>{label}</p>
                    <span className="badge">{value}</span>
                  </div>
                ))}
              </div>
              <div className="panel glass">
                <h2>SPACE FOR YOUR STORIES.</h2>
                <p className="muted" style={{ marginTop: 20 }}>
                  Configured allowance · {bytes(health.usage.allowance)}\nPublic
                  assets · {bytes(health.usage.public)} · Client assets and
                  reservations · {bytes(health.usage.client)}
                </p>
                <div className="progress-bar">
                  <span
                    style={{
                      width: Math.min(100, health.usage.percentage) + "%",
                    }}
                  />
                </div>
                <p className="muted">
                  {health.usage.percentage}% used · Approximately{" "}
                  {health.usage.additionalAlbums} more 500 MB albums. Includes
                  originals, previews, ZIPs and processing reservations.
                </p>
                {health.usage.warning && (
                  <p className="error">
                    Low storage: at least 80% of the allowance is reserved or
                    used.
                  </p>
                )}
              </div>
              <div className="panel glass">
                <h2>BACKGROUND TASKS.</h2>
                {jobs.slice(0, 15).map((j) => (
                  <div key={j.id} className="record">
                    <span className="badge">
                      {j.kind} · {j.state} · attempt {j.attempts}
                    </span>
                    {j.error && <p className="error">{j.error}</p>}
                  </div>
                ))}
                {!jobs.length && <p className="muted">No tasks yet.</p>}
              </div>
            </>
          ) : tab === "Website Content" && content ? (
            <ContentEditor
              content={content}
              assets={assets}
              onSaved={refresh}
              notify={notify}
            />
          ) : tab === "Media" ? (
            <>
              <div className="panel glass">
                <h2>ADD A PUBLIC PHOTOGRAPH.</h2>
                <p className="muted">
                  Upload first, then assign it in Website Content. Ready
                  replacements do not affect existing published placements.
                </p>
                <UploadForm
                  scope="public"
                  onDone={() => {
                    notify(
                      "Photograph processed. Assign it in Website Content.",
                    );
                    void refresh();
                  }}
                />
              </div>
              <div className="media-grid">
                {assets.map((a) => (
                  <article className="media-item glass" key={a.id}>
                    {a.status === "ready" ? (
                      <img
                        src={`/api/media/${a.id}?draft=1&w=400`}
                        alt={a.alt}
                      />
                    ) : (
                      <p>{a.status}</p>
                    )}
                    <p>{a.filename}</p>
                    <small>
                      {bytes(Number(a.bytes) + Number(a.preview_bytes))} ·{" "}
                      {a.width} × {a.height}\nUsed in:{" "}
                      {a.uses.join(", ") || "No placements"}
                    </small>
                    <button
                      className="button small"
                      onClick={() => {
                        setDeleteTarget({
                          type: "media-delete",
                          id: a.id,
                          title: a.filename,
                          details:
                            "Original and preview will be permanently removed. Assets used in a draft or published section cannot be deleted.",
                        });
                        setDeleteText("");
                      }}
                    >
                      <Trash2 size={13} /> DELETE ASSET
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : tab === "Bookings" ? (
            <div className="panel glass">
              <h2>THE SHARED CALENDAR.</h2>
              {!bookings.length && (
                <div className="empty">No booking requests yet.</div>
              )}
              {bookings.map((b) => (
                <article className="record" key={b.id}>
                  <div className="record-heading">
                    <div>
                      <h3>
                        {b.snapshot.name.toUpperCase()} ·{" "}
                        {money(b.snapshot.price)}
                      </h3>
                      <p>
                        {DateTime.fromISO(b.starts_at)
                          .setZone("Europe/London")
                          .toFormat("ccc, d LLL yyyy · HH:mm ZZZZ")}{" "}
                        · {b.snapshot.duration} minutes
                      </p>
                    </div>
                    <span className="badge">{b.state}</span>
                  </div>
                  <p>
                    {b.name} ·{" "}
                    <a className="contact" href={`mailto:${b.email}`}>
                      {b.email}
                    </a>{" "}
                    · {b.phone}\n{b.message}
                  </p>
                  <p style={{ marginTop: 10 }}>
                    Reference · {b.id}\nNotification status ·{" "}
                    {inbox
                      .filter((n) => n.dedupe.startsWith("booking:" + b.id))
                      .map((n) => n.kind + ": " + n.state)
                      .join(" / ") || "None"}
                    {b.state === "pending"
                      ? "\nHold expires · " +
                        new Date(b.expires_at).toLocaleString("en-GB", {
                          timeZone: "Europe/London",
                        })
                      : ""}
                  </p>
                  <div className="toolbar">
                    {b.state === "pending" && (
                      <>
                        <button
                          className="button small gold"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "booking",
                              { id: b.id, action: "approve" },
                              "Booking confirmed; notification queued.",
                            )
                          }
                        >
                          APPROVE
                        </button>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "booking",
                              { id: b.id, action: "decline" },
                              "Request declined; notification queued.",
                            )
                          }
                        >
                          DECLINE
                        </button>
                      </>
                    )}
                    {["pending", "confirmed"].includes(b.state) && (
                      <>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() => {
                            const value = window.prompt(
                              "New Europe/London date and time (YYYY-MM-DD HH:mm). This is revalidated with buffers.",
                            );
                            if (value) {
                              const local = DateTime.fromFormat(
                                value,
                                "yyyy-MM-dd HH:mm",
                                { zone: "Europe/London" },
                              );
                              if (!local.isValid) {
                                notify("Use YYYY-MM-DD HH:mm", true);
                                return;
                              }
                              void mutate(
                                "booking",
                                {
                                  id: b.id,
                                  action: "reschedule",
                                  start: local.toUTC().toISO(),
                                },
                                "Rescheduled; notification queued.",
                              );
                            }
                          }}
                        >
                          RESCHEDULE
                        </button>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "booking",
                              { id: b.id, action: "cancel" },
                              "Booking cancelled; notification queued.",
                            )
                          }
                        >
                          CANCEL
                        </button>
                      </>
                    )}
                    <a className="button small" href={`mailto:${b.email}`}>
                      CONTACT CUSTOMER
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : tab === "Availability" ? (
            <div className="panel glass">
              <AvailabilityEditor
                settings={settings}
                setSettings={setSettings}
                busy={busy}
                save={() => {
                  try {
                    void mutate(
                      "settings",
                      JSON.parse(settings),
                      "Availability updated with conflict checks.",
                    );
                  } catch {
                    notify("Configuration must be valid JSON", true);
                  }
                }}
              />
            </div>
          ) : tab === "Clients & Galleries" ? (
            <>
              <div className="panel glass">
                <h2>A NEW CLIENT.</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutate(
                      "customer",
                      {
                        action: "create",
                        name: f.get("name"),
                        email: f.get("email"),
                      },
                      "Customer created. Issue an access-setup email when ready.",
                    );
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Customer name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Email
                      <input name="email" type="email" required />
                    </label>
                  </div>
                  <button
                    className="button small"
                    disabled={busy}
                    style={{ marginTop: 15 }}
                  >
                    CREATE CUSTOMER
                    <Plus size={14} />
                  </button>
                </form>
                {customers
                  .filter((c) => !c.deleted_at)
                  .map((c) => (
                    <div className="record" key={c.id}>
                      <div className="record-heading">
                        <div>
                          <h3>{c.name}</h3>
                          <p>{c.email}</p>
                        </div>
                        <span className="badge">
                          {c.revoked ? "revoked" : "active"}
                        </span>
                      </div>
                      <div className="toolbar">
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "customer",
                              { action: "setup", id: c.id },
                              "Access reset. One-time setup email queued; old sessions revoked.",
                            )
                          }
                        >
                          ISSUE / RESET ACCESS
                        </button>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "customer",
                              { action: "revoke", id: c.id },
                              "Client access revoked immediately.",
                            )
                          }
                        >
                          REVOKE ACCESS
                        </button>
                        <button
                          className="button small"
                          onClick={() => {
                            setDeleteTarget({
                              type: "customer",
                              id: c.id,
                              title: c.name,
                              details:
                                "Client identity, login sessions, access links, all assigned galleries, photographs, previews and ZIPs. Access is revoked immediately; files are removed by retryable cleanup.",
                            });
                            setDeleteText("");
                          }}
                        >
                          DELETE CUSTOMER
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="panel glass">
                <h2>CREATE A PRIVATE CHAPTER.</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutate(
                      "gallery",
                      {
                        action: "create",
                        customerId: f.get("customerId"),
                        title: f.get("title"),
                        sessionDate: f.get("sessionDate"),
                        expiresAt: DateTime.fromISO(
                          String(f.get("expiresAt")),
                          { zone: "Europe/London" },
                        )
                          .toUTC()
                          .toISO(),
                      },
                      "Gallery created. Upload photographs below.",
                    );
                  }}
                >
                  <label>
                    Client
                    <select name="customerId" required>
                      <option value="">Select a client</option>
                      {customers
                        .filter((c) => !c.deleted_at && !c.revoked)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.email}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Album title
                    <input name="title" required maxLength={120} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Session date
                      <input name="sessionDate" type="date" required />
                    </label>
                    <label>
                      Gallery expiry · Europe/London
                      <input name="expiresAt" type="datetime-local" required />
                    </label>
                  </div>
                  <button
                    className="button small"
                    disabled={busy}
                    style={{ marginTop: 20 }}
                  >
                    CREATE GALLERY
                    <Plus size={14} />
                  </button>
                </form>
              </div>
              {galleries.map((g) => (
                <article className="panel glass" key={g.id}>
                  <div className="record-heading">
                    <div>
                      <h2>{g.title}</h2>
                      <p className="muted">
                        {g.customer_name} · {g.count} photos ·{" "}
                        {bytes(Number(g.storage_bytes))}\nExpiry ·{" "}
                        {new Date(g.expires_at).toLocaleString("en-GB", {
                          timeZone: "Europe/London",
                        })}
                      </p>
                    </div>
                    <span className="badge">
                      {g.revoked ? "revoked · " : ""}
                      {g.state}
                    </span>
                  </div>
                  {g.error && <p className="error">{g.error}</p>}
                  {!g.revoked && g.state !== "deleted" && (
                    <UploadForm
                      scope="client"
                      galleryId={g.id}
                      onDone={() => {
                        notify(
                          "Photograph uploaded. Preview and ZIP job queued.",
                        );
                        void refresh();
                      }}
                    />
                  )}
                  <div className="toolbar">
                    {g.state !== "deleted" && (
                      <>
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "gallery",
                              { id: g.id, action: "retry" },
                              "Processing / cleanup queued for retry.",
                            )
                          }
                        >
                          RETRY PROCESSING
                        </button>
                        {!g.revoked && (
                          <>
                            <button
                              className="button small"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  "gallery",
                                  { id: g.id, action: "revoke" },
                                  "Gallery access revoked.",
                                )
                              }
                            >
                              REVOKE
                            </button>
                            <button
                              className="button small"
                              onClick={() => {
                                const value = window.prompt(
                                  "New gallery expiry in Europe/London: YYYY-MM-DD HH:mm",
                                );
                                if (value) {
                                  const d = DateTime.fromFormat(
                                    value,
                                    "yyyy-MM-dd HH:mm",
                                    { zone: "Europe/London" },
                                  );
                                  if (d.isValid)
                                    void mutate(
                                      "gallery",
                                      {
                                        id: g.id,
                                        action: "expiry",
                                        expiresAt: d.toUTC().toISO(),
                                      },
                                      "Expiry updated.",
                                    );
                                  else notify("Invalid expiry", true);
                                }
                              }}
                            >
                              CHANGE EXPIRY
                            </button>
                          </>
                        )}
                        <button
                          className="button small"
                          onClick={() => {
                            setDeleteTarget({
                              type: "gallery",
                              id: g.id,
                              title: g.title,
                              details: `All ${g.count} photographs, private previews, ZIP and processing files (${bytes(Number(g.storage_bytes))}). Access is revoked immediately. Backup copies follow their separate retention policy.`,
                            });
                            setDeleteText("");
                          }}
                        >
                          DELETE GALLERY
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </>
          ) : tab === "Email Inbox" ? (
            <div className="panel glass">
              <h2>TRANSACTIONAL EMAILS.</h2>
              <p className="muted" style={{ marginTop: 15 }}>
                Preview = stored locally, not sent. Accepted = SMTP provider
                accepted, not proof of delivery. Delivered is reserved for
                verified delivery events. Stable message IDs reduce duplicates,
                but SMTP cannot guarantee exactly-once delivery across a crash.
              </p>
              {inbox.map((n) => (
                <article key={n.id} className="record">
                  <div className="record-heading">
                    <div>
                      <h3>{n.kind.toUpperCase()}</h3>
                      <p>
                        {n.recipient} ·{" "}
                        {new Date(n.created_at).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <span className="badge">
                      {n.state} · attempt {n.attempts}
                    </span>
                  </div>
                  {n.error && <p className="error">{n.error}</p>}
                  <div className="toolbar">
                    {n.html && (
                      <button
                        className="button small"
                        onClick={() =>
                          setSelectedEmail(
                            selectedEmail?.id === n.id ? null : n,
                          )
                        }
                      >
                        VIEW EMAIL
                      </button>
                    )}
                    {n.state === "failed" && (
                      <button
                        className="button small"
                        onClick={() =>
                          mutate(
                            "notification-retry",
                            { id: n.id },
                            "Email queued for retry.",
                          )
                        }
                      >
                        RETRY
                      </button>
                    )}
                  </div>
                  {selectedEmail?.id === n.id && (
                    <div className="notification" style={{ marginTop: 20 }}>
                      <iframe
                        title="Branded email preview"
                        srcDoc={n.html}
                        sandbox=""
                      />
                      <pre>{n.plain}</pre>
                    </div>
                  )}
                </article>
              ))}
              {!inbox.length && (
                <div className="empty">No notifications yet.</div>
              )}
            </div>
          ) : tab === "Audit" ? (
            <div className="panel glass">
              <h2>STUDIO ACTIVITY.</h2>
              {events.map((e) => (
                <div className="record" key={e.id}>
                  <span className="badge">{e.action}</span>
                  <p>
                    {new Date(e.created_at).toLocaleString("en-GB")}\nActor ·{" "}
                    {e.actor}\nTarget · {e.target || "Website"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {deleteTarget && (
        <div className="modal-overlay" role="presentation">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="modal glass"
          >
            <h2 id="delete-title">PERMANENTLY DELETE?</h2>
            <h3 style={{ marginTop: 20 }}>{deleteTarget.title}</h3>
            <p className="muted" style={{ marginTop: 20 }}>
              {deleteTarget.details}
            </p>
            <label>
              Type DELETE to confirm
              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                autoFocus
              />
            </label>
            <div className="form-actions">
              <button className="button" onClick={() => setDeleteTarget(null)}>
                KEEP IT
              </button>
              <button
                className="button gold"
                disabled={deleteText !== "DELETE" || busy}
                onClick={async () => {
                  await mutate(
                    deleteTarget.type,
                    {
                      id: deleteTarget.id,
                      action: "delete",
                      confirm: deleteText,
                    },
                    "Deletion queued. Access revoked; storage is reclaimed after cleanup completes.",
                  );
                  setDeleteTarget(null);
                }}
              >
                DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
