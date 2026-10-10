"use client";
import { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import {
  ArrowUpRight,
  Plus,
  Save,
  Eye,
  Upload,
  Trash2,
  Check,
  Smartphone,
} from "lucide-react";
import { Content } from "@/lib/content";
import { api, bytes, money } from "./api";
import Login from "./Login";
import AdminFrame from "./AdminFrame";
import ContentWorkspace from "./ContentWorkspace";
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
const contentTabs = [
  "Identity & Copy",
  "Banner Settings",
  "Team",
  "Packages",
  "Image Placements",
  "Reviews & FAQs",
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
      className="admin-upload-form"
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
    [section, setSection] = useState("Identity & Copy"),
    [uploadBusy, setUploadBusy] = useState(false);
  useEffect(() => setC(content), [content]);
  const set = (field: keyof Content, value: any) =>
    setC({ ...c, [field]: value });
  const action = async (publish = false) => {
    setBusy(true);
    notify(publish ? "Publishing…" : "Saving draft…");
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
    <div className="admin-content-editor">
      <div className="toolbar admin-content-actions">
        <button
          className="button small"
          disabled={busy || uploadBusy}
          onClick={() => action()}
        >
          <Save size={14} /> SAVE DRAFT
        </button>
        <a className="button small" href="/preview" target="_blank">
          <Eye size={14} /> PREVIEW DRAFT
        </a>
        <a className="button small" href="/mobile" target="_blank">
          <Smartphone size={14} /> MOBILE TEST
        </a>
        <button
          className="button small gold"
          disabled={busy || uploadBusy}
          onClick={() => action(true)}
        >
          <Check size={14} /> SAVE & PUBLISH
        </button>
      </div>
      <p className="muted" style={{ marginTop: 15 }}>
        Edit → save draft → preview → publish. Replacing a placement keeps the
        published photograph until publication.
      </p>
      <div
        className="tabs"
        role="tablist"
        aria-label="Content editing areas"
        onKeyDown={(e) => tabKeys(e, contentTabs, section, setSection)}
      >
        {contentTabs.map((s) => (
          <button
            key={s}
            role="tab"
            disabled={uploadBusy}
            aria-selected={s === section}
            tabIndex={s === section ? 0 : -1}
            className={s === section ? "active" : ""}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="content-workspace-panel">
        <fieldset className="content-controls" disabled={busy || uploadBusy}>
          <ContentWorkspace
            content={c}
            setContent={setC}
            assets={assets}
            section={section}
            onBusy={setUploadBusy}
            notify={notify}
          />
        </fieldset>
      </div>
    </div>
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
              <div className="record admin-working-day" key={day}>
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const matches = (values: unknown[]) =>
    values.join(" ").toLowerCase().includes(query.toLowerCase().trim());

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
  useEffect(() => {
    if (!authenticated || busy) return;
    let active = true;
    let fetching = false;
    const updateBookings = async () => {
      if (document.visibilityState !== "visible" || fetching) return;
      fetching = true;
      try {
        const latest = await api("admin/bookings");
        if (active) setBookings(latest);
      } catch (e) {
        if (active) setError(`Could not update bookings: ${(e as Error).message}`);
      } finally {
        fetching = false;
      }
    };
    void updateBookings();
    const timer = window.setInterval(() => void updateBookings(), 10000);
    window.addEventListener("focus", updateBookings);
    document.addEventListener("visibilitychange", updateBookings);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", updateBookings);
      document.removeEventListener("visibilitychange", updateBookings);
    };
  }, [authenticated, busy, tab]);
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
  const recordCount: Record<string, number> = {
    Bookings: bookings.filter(
      (b) =>
        matches([b.name, b.email, b.phone, b.snapshot.name, b.id]) &&
        (filter === "all" || b.state === filter),
    ).length,
    Clients: customers.filter(
      (c) => !c.deleted_at && matches([c.name, c.email]),
    ).length,
    Galleries: galleries.filter(
      (g) =>
        matches([g.title, g.customer_name, g.state]) &&
        (filter === "all" || g.state === filter),
    ).length,
    "Email Inbox": inbox.filter((n) => matches([n.kind, n.recipient, n.state]))
      .length,
    Audit: events.filter((e) => matches([e.action, e.actor, e.target])).length,
  };
  return (
    <AdminFrame
      authenticated={authenticated && !loading}
      tab={tab}
      setTab={(next) => {
        setTab(next);
        setQuery("");
        setFilter("all");
        setError("");
        setMessage("");
      }}
      query={query}
      setQuery={setQuery}
      counts={{
        Bookings: bookings.filter((b) => b.state === "pending").length,
        Clients: customers.filter((c) => !c.deleted_at).length,
        Galleries: galleries.filter((g) => g.state !== "deleted").length,
        "Email Inbox": inbox.filter((n) => n.state === "failed").length,
      }}
      refresh={refresh}
      logout={logout}
    >
      {loading ? (
        <div className="workspace">
          <p role="status">Opening the studio…</p>
        </div>
      ) : !authenticated ? (
        <Login admin onSuccess={refresh} />
      ) : (
        <div className="workspace admin-workspace">
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
          {query && (
            <p className="admin-search-status" role="status">
              Showing records matching “{query}”.{" "}
              <button onClick={() => setQuery("")}>Clear search</button>
            </p>
          )}
          {recordCount[tab] === 0 && (
            <div className="admin-no-results" role="status">
              {query || filter !== "all" ? (
                <>
                  No matching records.{" "}
                  <button
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Show all records
                  </button>
                </>
              ) : (
                "No records yet."
              )}
            </div>
          )}
          {tab === "Overview" && health ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <h2>Studio overview</h2>
                  <p className="muted">
                    Your requests, collections and service status at a glance.
                  </p>
                </div>
                <div className="toolbar">
                  <button
                    className="button small gold"
                    onClick={() => setTab("Bookings")}
                  >
                    Review requests <ArrowUpRight size={13} />
                  </button>
                  <button
                    className="button small"
                    onClick={() => setTab("Galleries")}
                  >
                    Manage galleries <ArrowUpRight size={13} />
                  </button>
                  <button
                    className="button small"
                    onClick={() => setTab("Website Content")}
                  >
                    Edit website <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
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
              <div className="admin-overview-grid">
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
                    Configured allowance · {bytes(health.usage.allowance)}·
                    Public assets · {bytes(health.usage.public)} · Client assets
                    and reservations · {bytes(health.usage.client)}
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
              </div>
            </>
          ) : tab === "Website Content" && content ? (
            <ContentEditor
              content={content}
              assets={assets}
              onSaved={refresh}
              notify={notify}
            />
          ) : tab === "Bookings" ? (
            <div className="panel glass admin-bookings">
              <div className="admin-section-heading">
                <h2>
                  Booking requests{" "}
                  <span className="admin-count">{bookings.length}</span>
                </h2>
                <label className="admin-filter">
                  Status
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All bookings</option>
                    {[
                      "pending",
                      "confirmed",
                      "declined",
                      "cancelled",
                      "expired",
                    ].map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-row-labels">
                <span>Session / date</span>
                <span>Client</span>
                <span>Actions</span>
              </div>
              {!bookings.length && (
                <div className="empty">No booking requests yet.</div>
              )}
              {bookings
                .filter(
                  (b) =>
                    matches([
                      b.name,
                      b.email,
                      b.phone,
                      b.snapshot.name,
                      b.id,
                    ]) &&
                    (filter === "all" || b.state === filter),
                )
                .map((b) => (
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
                      <span className="badge" data-status={b.state}>
                        {b.state}
                      </span>
                    </div>
                    <div className="admin-booking-client">
                      <strong>{b.name}</strong>
                      <a href={`mailto:${b.email}`}>{b.email}</a>
                      <details className="admin-row-details">
                        <summary>Details</summary>
                        <div>
                          <p>
                            {b.phone} · {b.message || "No message"}
                          </p>
                          <p>Reference · {b.id}</p>
                          <p>
                            Notification status ·{" "}
                            {inbox
                              .filter((n) =>
                                n.dedupe.startsWith("booking:" + b.id),
                              )
                              .map((n) => n.kind + ": " + n.state)
                              .join(" / ") || "None"}
                          </p>
                          {b.state === "pending" && (
                            <p>
                              Hold expires ·{" "}
                              {new Date(b.expires_at).toLocaleString("en-GB", {
                                timeZone: "Europe/London",
                              })}
                            </p>
                          )}
                        </div>
                      </details>
                    </div>
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
            <div className="panel glass admin-availability">
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
          ) : ["Clients", "Galleries"].includes(tab) ? (
            <>
              {tab === "Clients" && (
                <div className="panel glass admin-clients">
                  <h2>
                    Clients{" "}
                    <span className="admin-count">
                      {customers.filter((c) => !c.deleted_at).length}
                    </span>
                  </h2>
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
                    .filter((c) => !c.deleted_at && matches([c.name, c.email]))
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
              )}
              {tab === "Galleries" && (
                <>
                  <div className="panel glass admin-create-gallery">
                    <h2>Create a gallery</h2>
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
                          <input
                            name="expiresAt"
                            type="datetime-local"
                            required
                          />
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
                  <div className="admin-section-heading">
                    <h2>
                      Private galleries{" "}
                      <span className="admin-count">{galleries.length}</span>
                    </h2>
                    <label className="admin-filter">
                      Status
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All galleries</option>
                        {Array.from(new Set(galleries.map((g) => g.state))).map(
                          (state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  {galleries
                    .filter(
                      (g) =>
                        matches([g.title, g.customer_name, g.state]) &&
                        (filter === "all" || g.state === filter),
                    )
                    .map((g) => (
                      <article
                        className="panel glass admin-gallery-row"
                        key={g.id}
                      >
                        <div className="record-heading">
                          <div>
                            <h2>{g.title}</h2>
                            <p className="muted">
                              {g.customer_name} · {g.count} photos ·{" "}
                              {bytes(Number(g.storage_bytes))} · Expiry ·{" "}
                              {new Date(g.expires_at).toLocaleString("en-GB", {
                                timeZone: "Europe/London",
                              })}
                            </p>
                          </div>
                          <span
                            className="badge"
                            data-status={g.revoked ? "revoked" : g.state}
                          >
                            {g.revoked ? "revoked · " : ""}
                            {g.state}
                          </span>
                        </div>
                        {g.error && <p className="error">{g.error}</p>}
                        {!g.revoked && g.state !== "deleted" && (
                          <details className="admin-gallery-upload">
                            <summary>
                              <Upload size={13} /> Upload photographs
                            </summary>
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
                          </details>
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
              )}
            </>
          ) : tab === "Email Inbox" ? (
            <div className="panel glass admin-email">
              <h2>
                Transactional emails{" "}
                <span className="admin-count">{inbox.length}</span>
              </h2>
              <p className="muted" style={{ marginTop: 15 }}>
                Preview = stored locally, not sent. Accepted = SMTP provider
                accepted, not proof of delivery. Delivered is reserved for
                verified delivery events. Stable message IDs reduce duplicates,
                but SMTP cannot guarantee exactly-once delivery across a crash.
              </p>
              {inbox
                .filter((n) => matches([n.kind, n.recipient, n.state]))
                .map((n) => (
                  <article key={n.id} className="record">
                    <div className="record-heading">
                      <div>
                        <h3>{n.kind.toUpperCase()}</h3>
                        <p>
                          {n.recipient} ·{" "}
                          {new Date(n.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                      <span className="badge" data-status={n.state}>
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
            <div className="panel glass admin-audit">
              <h2>
                Studio activity{" "}
                <span className="admin-count">{events.length}</span>
              </h2>
              {events
                .filter((e) => matches([e.action, e.actor, e.target]))
                .map((e) => (
                  <div className="record" key={e.id}>
                    <span className="badge">{e.action}</span>
                    <p>
                      {new Date(e.created_at).toLocaleString("en-GB")} · Actor ·{" "}
                      {e.actor} · Target · {e.target || "Website"}
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
    </AdminFrame>
  );
}
