"use client";
import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from "react";
import {
  Plus,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Camera,
  Upload,
} from "lucide-react";
import type { Content } from "@/lib/content";
import { api, money } from "./api";

type Props = {
  content: Content;
  setContent: Dispatch<SetStateAction<Content>>;
  assets: any[];
  section: string;
  onBusy: (busy: boolean) => void;
  notify: (message: string, error?: boolean) => void;
};
type Placement = Content["hero"][number];
function Field({
  label,
  value,
  change,
  type = "text",
  area = false,
}: {
  label: string;
  value: string | number;
  change: (value: string) => void;
  type?: string;
  area?: boolean;
}) {
  return (
    <label>
      {label}
      {area ? (
        <textarea value={value} onChange={(e) => change(e.target.value)} />
      ) : (
        <input
          type={type}
          step={
            type === "number"
              ? label === "Price · GBP"
                ? "0.01"
                : "1"
              : undefined
          }
          value={value}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </label>
  );
}
function Toggle({
  label,
  value,
  change,
}: {
  label: string;
  value: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => change(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Pager({
  page,
  count,
  size,
  setPage,
}: {
  page: number;
  count: number;
  size: number;
  setPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="content-pager">
      <button
        className="button small"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        {page + 1} / {pages} · {count} items
      </span>
      <button
        className="button small"
        disabled={page >= pages - 1}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
function RecordList({
  items,
  selected,
  select,
  add,
  addLabel,
}: {
  items: { title: string; subtitle?: string; image?: string }[];
  selected: number;
  select: (n: number) => void;
  add: () => void;
  addLabel: string;
}) {
  const page = Math.floor(Math.max(0, selected) / 6);
  return (
    <aside className="content-record-list">
      <button className="button small gold" onClick={add}>
        <Plus size={13} />
        {addLabel}
      </button>
      <div className="content-list-items">
        {items.slice(page * 6, page * 6 + 6).map((item, n) => (
          <button
            key={page * 6 + n}
            className={selected === page * 6 + n ? "selected" : ""}
            onClick={() => select(page * 6 + n)}
          >
            {item.image && <img src={item.image} alt="" />}
            <span>
              <strong>{item.title}</strong>
              {item.subtitle && <small>{item.subtitle}</small>}
            </span>
          </button>
        ))}
      </div>
      <Pager
        page={page}
        count={items.length}
        size={6}
        setPage={(n) => select(n * 6)}
      />
    </aside>
  );
}
export default function ContentWorkspace({
  content: c,
  setContent,
  assets,
  section,
  onBusy,
  notify,
}: Props) {
  const [identityGroup, setIdentityGroup] = useState("Studio details");
  const [selected, setSelected] = useState(0),
    [reviewKind, setReviewKind] = useState<"reviews" | "faqs">("reviews"),
    [available, setAvailable] = useState(assets),
    [uploading, setUploading] = useState(false);
  useEffect(() => {
    setSelected(0);
  }, [section, reviewKind, identityGroup]);
  useEffect(() => {
    setAvailable((previous) => [
      ...assets,
      ...previous.filter((a) => !assets.some((b) => b.id === a.id)),
    ]);
  }, [assets]);
  const set = <K extends keyof Content>(key: K, value: Content[K]) =>
    setContent((previous) => ({ ...previous, [key]: value }));
  const ready = available.filter((a) => a.status === "ready");
  const upload = async (
    files: File[],
    target: "hero" | "wall" | "portrait",
    member = 0,
  ) => {
    if (!files.length) return;
    if (
      target !== "portrait" &&
      c[target].length + files.length > (target === "hero" ? 30 : 100)
    ) {
      notify(
        `Choose fewer photographs: ${target === "hero" ? "the hero slideshow supports 30" : "the gallery wall supports 100"} photographs.`,
        true,
      );
      return;
    }
    setUploading(true);
    onBusy(true);
    let added = 0;
    try {
      for (const file of files) {
        const alt =
          file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") ||
          "Studio photograph";
        const form = new FormData();
        form.set("scope", "public");
        form.set("file", file);
        form.set("alt", alt);
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed");
        const placement = { id: result.id, alt, desktop: 50, mobile: 50 };
        setContent((previous) =>
          target === "portrait"
            ? {
                ...previous,
                team: previous.team.map((t, n) =>
                  n === member ? { ...t, portrait: placement } : t,
                ),
              }
            : { ...previous, [target]: [...previous[target], placement] },
        );
        added++;
      }
      notify(
        `${added} photograph${added === 1 ? "" : "s"} uploaded and added to the draft. Save and publish when ready.`,
      );
    } catch (error) {
      notify(
        `${added ? `${added} uploaded. ` : ""}${(error as Error).message}`,
        true,
      );
    } finally {
      try {
        setAvailable(await api("admin/media"));
      } catch {}
      setUploading(false);
      onBusy(false);
    }
  };
  const uploadControl = (target: "hero" | "wall" | "portrait", member = 0) => (
    <label className="content-upload-button">
      <Upload size={13} />
      {uploading ? "Uploading…" : "Upload photographs"}
      <input
        aria-label={
          target === "portrait"
            ? "Upload team portrait"
            : `Upload ${target === "hero" ? "hero slideshow" : "gallery wall"} photographs`
        }
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={target !== "portrait"}
        disabled={uploading}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          void upload(files, target, member);
        }}
      />
    </label>
  );
  const picturePicker = (
    label: string,
    value: Placement | null,
    change: (p: Placement | null) => void,
  ) => (
    <label>
      {label}
      <select
        value={value?.id || ""}
        onChange={(e) => {
          const a = ready.find((a) => a.id === e.target.value);
          change(a ? { id: a.id, alt: a.alt, desktop: 50, mobile: 50 } : null);
        }}
      >
        <option value="">Choose from Media…</option>
        {ready.map((a) => (
          <option key={a.id} value={a.id}>
            {a.filename}
          </option>
        ))}
      </select>
    </label>
  );
  if (section === "Identity & Copy") {
    const copyKeys = Object.keys(c.copy) as (keyof Content["copy"])[];
    const index = Math.min(selected, copyKeys.length);
    const key = copyKeys[index - 1];
    const socialIndex = Math.min(selected, Math.max(0, c.socials.length - 1));
    const social = c.socials[socialIndex];
    return (
      <div className="content-workspace">
        <div className="content-section-bar">
          <div className="toolbar">
            {["Studio details", "Website text", "Social links"].map((group) => (
              <button
                key={group}
                className={`button small ${identityGroup === group ? "gold" : ""}`}
                aria-pressed={identityGroup === group}
                onClick={() => setIdentityGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
        {identityGroup === "Studio details" ? (
          <div className="content-detail">
            <div className="content-two-columns">
              <Field
                label="Brand name"
                value={c.brand}
                change={(v) => set("brand", v)}
              />
              <Field
                label="Logo monogram"
                value={c.logo}
                change={(v) => set("logo", v)}
              />
              <Field
                label="Contact email"
                type="email"
                value={c.email}
                change={(v) => set("email", v)}
              />
              <Field
                label="Contact phone"
                value={c.phone}
                change={(v) => set("phone", v)}
              />
              <Field
                label="Location / contact address"
                value={c.address}
                change={(v) => set("address", v)}
              />
              <Field
                label="Gallery delivery wording"
                value={c.deliveryCopy}
                change={(v) => set("deliveryCopy", v)}
              />
            </div>
            <Toggle
              label="Show development sample-media and demo-price notices"
              value={c.demo}
              change={(v) => set("demo", v)}
            />
          </div>
        ) : identityGroup === "Website text" ? (
          <div className="content-master-detail">
            <RecordList
              items={[
                { title: "Main hero headline", subtitle: c.headline },
                ...copyKeys.map((key) => ({
                  title: key.replace(/([A-Z])/g, " $1"),
                  subtitle: c.copy[key],
                })),
              ]}
              selected={index}
              select={setSelected}
              addLabel="Main hero headline"
              add={() => setSelected(0)}
            />
            <div className="content-detail">
              {index === 0 ? (
                <>
                  <Field
                    label="Hero headline · one line per row"
                    value={c.headline}
                    area
                    change={(v) => set("headline", v)}
                  />
                  <Field
                    label="Supporting copy"
                    value={c.description}
                    area
                    change={(v) => set("description", v)}
                  />
                </>
              ) : (
                <Field
                  label={key.replace(/([A-Z])/g, " $1")}
                  value={c.copy[key]}
                  area
                  change={(v) => set("copy", { ...c.copy, [key]: v })}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="content-master-detail">
            <RecordList
              items={c.socials.map((s) => ({
                title: s.label,
                subtitle: s.url,
              }))}
              selected={socialIndex}
              select={setSelected}
              addLabel="Add social link"
              add={() => {
                set("socials", [
                  ...c.socials,
                  { label: "Social profile", url: "https://example.com" },
                ]);
                setSelected(c.socials.length);
              }}
            />
            <div className="content-detail">
              {social ? (
                <>
                  <Field
                    label="Label"
                    value={social.label}
                    change={(label) =>
                      set(
                        "socials",
                        c.socials.map((s, n) =>
                          n === socialIndex ? { ...s, label } : s,
                        ),
                      )
                    }
                  />
                  <Field
                    label="HTTPS URL"
                    value={social.url}
                    change={(url) =>
                      set(
                        "socials",
                        c.socials.map((s, n) =>
                          n === socialIndex ? { ...s, url } : s,
                        ),
                      )
                    }
                  />
                  <button
                    className="button small"
                    onClick={() => {
                      set(
                        "socials",
                        c.socials.filter((_, n) => n !== socialIndex),
                      );
                      setSelected(0);
                    }}
                  >
                    Remove link
                  </button>
                </>
              ) : (
                <p className="empty">Add a social profile.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (section === "Banner Settings") {
    const banner = c.banner || {
      split: 38,
      positionX: 50,
      positionY: 50,
      zoom: 100,
    };
    const updateBanner = (patch: Partial<typeof banner>) =>
      set("banner", { ...banner, ...patch });
    const firstHero = c.hero[0];
    return (
      <div className="content-workspace">
        <div className="content-section-bar">
          <h2>Hero Banner Configuration</h2>
          <span className="muted">
            Fine-tune how photographs sit inside the hero banner with real-time preview.
          </span>
        </div>
        <div className="content-two-columns" style={{ alignItems: "flex-start", gap: 30 }}>
          <div className="content-detail" style={{ background: "rgba(25,23,19,0.7)", padding: 25, borderRadius: 6, border: "1px solid var(--line)" }}>
            <h3>Adjustment Controls</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Adjust the black vignette boundary, photo positioning, and zoom scale.
            </p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Black Fade / Split Position</label>
                <strong style={{ color: "var(--gold)" }}>{banner.split}% from left</strong>
              </div>
              <input
                type="range"
                min="15"
                max="70"
                step="1"
                value={banner.split}
                onChange={(e) => updateBanner({ split: Number(e.target.value) })}
              />
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                Determines how much of the left side is dedicated to pure black text backdrop before fading out to the photo.
              </small>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Horizontal Photo Position (X)</label>
                <strong style={{ color: "var(--gold)" }}>{banner.positionX}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={banner.positionX}
                onChange={(e) => updateBanner({ positionX: Number(e.target.value) })}
              />
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                0% = Left aligned, 50% = Center, 100% = Right aligned.
              </small>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Vertical Photo Position (Y)</label>
                <strong style={{ color: "var(--gold)" }}>{banner.positionY}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={banner.positionY}
                onChange={(e) => updateBanner({ positionY: Number(e.target.value) })}
              />
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                0% = Top aligned, 50% = Center, 100% = Bottom aligned.
              </small>
            </div>
            <div style={{ marginBottom: 25 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Zoom Level</label>
                <strong style={{ color: "var(--gold)" }}>{banner.zoom}%</strong>
              </div>
              <input
                type="range"
                min="100"
                max="220"
                step="2"
                value={banner.zoom}
                onChange={(e) => updateBanner({ zoom: Number(e.target.value) })}
              />
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                100% = Standard fit, up to 220% for close-up punch-in.
              </small>
            </div>
            <div className="toolbar">
              <button
                type="button"
                className="button small"
                onClick={() =>
                  updateBanner({ split: 38, positionX: 50, positionY: 50, zoom: 100 })
                }
              >
                Reset to Defaults (38% split, 50% pos, 100% zoom)
              </button>
            </div>
          </div>
          <div className="content-detail" style={{ background: "#050505", padding: 20, borderRadius: 6, border: "1px solid var(--line)" }}>
            <h3>Live Banner Simulation</h3>
            <p className="muted" style={{ marginBottom: 15 }}>
              Simulated preview based on your current sliders:
            </p>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 280,
                background: "#000",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid rgba(200, 173, 127, 0.25)",
              }}
            >
              {firstHero ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    left: `${banner.split}%`,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={`/api/media/${firstHero.id}?draft=1&w=800`}
                    alt={firstHero.alt}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `${banner.positionX}% ${banner.positionY}%`,
                      transform: `scale(${banner.zoom / 100})`,
                      transformOrigin: `${banner.positionX}% ${banner.positionY}%`,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                  }}
                >
                  No hero photo selected yet
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(90deg, #000 0%, #000 ${banner.split}%, rgba(0,0,0,0.92) ${banner.split + 8}%, rgba(0,0,0,0.45) ${banner.split + 18}%, transparent ${banner.split + 32}%)`,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  maxWidth: "35%",
                  zIndex: 5,
                }}
              >
                <small style={{ color: "var(--gold)", fontSize: 8, letterSpacing: 1.5, display: "block" }}>
                  TWO PERSPECTIVES.
                </small>
                <h4 style={{ fontSize: 18, margin: "6px 0", lineHeight: 0.9 }}>
                  MOMENTS BECOME CHAPTERS
                </h4>
                <p style={{ fontSize: 8, color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                  Cinematic photography in Leicester.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (section === "Team") {
    const index = Math.min(selected, c.team.length - 1),
      t = c.team[index];
    const update = (patch: Partial<typeof t>) =>
      set(
        "team",
        c.team.map((item, n) => (n === index ? { ...item, ...patch } : item)),
      );
    return (
      <div className="content-workspace">
        <div className="content-section-bar">
          <h2>
            Team members <span className="admin-count">{c.team.length}</span>
          </h2>
          <span className="muted">
            Member 1 is your primary profile and cannot be removed.
          </span>
        </div>
        <div className="content-master-detail">
          <RecordList
            items={c.team.map((t, n) => ({
              title: t.name || "Unnamed member",
              subtitle: n === 0 ? "Primary profile · required" : t.role,
              image: t.portrait
                ? `/api/media/${t.portrait.id}?draft=1&w=160`
                : undefined,
            }))}
            selected={index}
            select={setSelected}
            addLabel="Add team member"
            add={() => {
              set("team", [
                ...c.team,
                {
                  name: "New team member",
                  role: "Photographer",
                  sample: false,
                  portrait: null,
                },
              ]);
              setSelected(c.team.length);
            }}
          />
          <div className="content-detail">
            <div className="content-team-profile">
              <div className="content-portrait">
                {t.portrait ? (
                  <img
                    src={`/api/media/${t.portrait.id}?draft=1&w=400`}
                    alt={t.portrait.alt}
                  />
                ) : (
                  <Camera size={30} />
                )}
              </div>
              <div className="content-profile-fields">
                <Field
                  label="Display name"
                  value={t.name}
                  change={(name) => update({ name })}
                />
                <Field
                  label="Role"
                  value={t.role}
                  change={(role) => update({ role })}
                />
              </div>
            </div>
            <div className="content-two-columns">
              {picturePicker("Team portrait", t.portrait, (portrait) =>
                update({ portrait }),
              )}
              {t.portrait && (
                <Field
                  label="Portrait alternative text"
                  value={t.portrait.alt}
                  change={(alt) =>
                    update({ portrait: { ...t.portrait!, alt } })
                  }
                />
              )}
            </div>
            <div className="toolbar">
              {uploadControl("portrait", index)}
              {index > 0 && (
                <button
                  className="button small"
                  onClick={() => {
                    set(
                      "team",
                      c.team.filter((_, n) => n !== index),
                    );
                    setSelected(Math.max(0, index - 1));
                  }}
                >
                  <Trash2 size={13} />
                  Remove member
                </button>
              )}
            </div>
            <Toggle
              label="Placeholder identity and portrait notice"
              value={t.sample}
              change={(sample) => update({ sample })}
            />
            <Field
              label="Central quotation"
              value={c.teamQuote}
              change={(v) => set("teamQuote", v)}
            />
          </div>
        </div>
      </div>
    );
  }
  if (section === "Packages") {
    const index = Math.min(selected, Math.max(0, c.packages.length - 1)),
      p = c.packages[index];
    const add = (duplicate = false) => {
      const next =
        duplicate && p
          ? {
              ...structuredClone(p),
              id: crypto.randomUUID(),
              name: p.name + " copy",
            }
          : {
              id: crypto.randomUUID(),
              name: "New package",
              price: 25000,
              duration: 120,
              description: "Tailored photography coverage",
              inclusions: ["Full consultation", "Online private gallery"],
              allowance: 25,
              delivery: "Within 2 weeks",
              visible: true,
              accepting: true,
              archived: false,
              image: null,
            };
      set("packages", [...c.packages, next]);
      setSelected(c.packages.length);
    };
    const update = (patch: Partial<typeof p>) =>
      set(
        "packages",
        c.packages.map((item, n) =>
          n === index ? { ...item, ...patch } : item,
        ),
      );
    const move = (offset: number) => {
      const next = [...c.packages];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      set("packages", next);
      setSelected(index + offset);
    };
    return (
      <div className="content-workspace">
        <div className="content-section-bar">
          <h2>
            Packages <span className="admin-count">{c.packages.length}</span>
          </h2>
          <Toggle
            label="Show packages section, navigation and public booking actions"
            value={c.packagesVisible}
            change={(v) => set("packagesVisible", v)}
          />
        </div>
        <div className="content-master-detail">
          <RecordList
            items={c.packages.map((p) => ({
              title: p.name,
              subtitle: `${money(p.price)} · ${p.duration} min${p.archived ? " · archived" : ""}`,
            }))}
            selected={index}
            select={setSelected}
            addLabel="Add package"
            add={() => add()}
          />
          <div className="content-detail">
            {p ? (
              <>
                <div className="content-two-columns">
                  <Field
                    label="Name"
                    value={p.name}
                    change={(name) => update({ name })}
                  />
                  <Field
                    label="Price · GBP"
                    type="number"
                    value={p.price / 100}
                    change={(price) =>
                      update({ price: Math.round(Number(price) * 100) })
                    }
                  />
                  <Field
                    label="Duration · minutes"
                    type="number"
                    value={p.duration}
                    change={(duration) =>
                      update({ duration: Number(duration) })
                    }
                  />
                  <Field
                    label="Edited-photo allowance"
                    type="number"
                    value={p.allowance}
                    change={(allowance) =>
                      update({ allowance: Number(allowance) })
                    }
                  />
                  <Field
                    label="Description"
                    value={p.description}
                    change={(description) => update({ description })}
                  />
                  <Field
                    label="Delivery estimate"
                    value={p.delivery}
                    change={(delivery) => update({ delivery })}
                  />
                  <Field
                    label="Inclusions · one per line"
                    value={p.inclusions.join("\n")}
                    area
                    change={(v) => update({ inclusions: v.split("\n") })}
                  />
                  <label>
                    Optional background
                    <select
                      value={p.image || ""}
                      onChange={(e) =>
                        update({ image: e.target.value || null })
                      }
                    >
                      <option value="">None</option>
                      {ready.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="toolbar">
                  <Toggle
                    label="Publicly visible"
                    value={p.visible}
                    change={(visible) => update({ visible })}
                  />
                  <Toggle
                    label="Accepting new requests"
                    value={p.accepting}
                    change={(accepting) => update({ accepting })}
                  />
                  <Toggle
                    label="Archived"
                    value={p.archived}
                    change={(archived) => update({ archived })}
                  />
                </div>
                <div className="toolbar">
                  <button className="button small" onClick={() => add(true)}>
                    <Copy size={13} />
                    Duplicate package
                  </button>
                  <button
                    className="button small"
                    aria-label="Move package up"
                    disabled={index === 0}
                    onClick={() => move(-1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    className="button small"
                    aria-label="Move package down"
                    disabled={index === c.packages.length - 1}
                    onClick={() => move(1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    className="button small"
                    onClick={() => {
                      set(
                        "packages",
                        c.packages.filter((_, n) => n !== index),
                      );
                      setSelected(Math.max(0, index - 1));
                    }}
                  >
                    Remove from draft
                  </button>
                </div>
                <p className="muted">
                  Existing bookings retain the package details agreed at
                  booking.
                </p>
              </>
            ) : (
              <p className="empty">
                Add a package to start with the editable template.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (section === "Image Placements")
    return (
      <div className="content-workspace">
        <div className="content-section-bar">
          <h2>Website photographs</h2>
          <span className="muted">
            Upload or choose from Media → Save Draft → Publish. JPEG, PNG or
            WebP, up to 25 MB each.
          </span>
        </div>
        <div className="content-image-columns">
          {(["hero", "wall"] as const).map((target) => (
            <ImageCollection
              key={target}
              title={
                target === "hero" ? "Hero slideshow" : "Animated gallery wall"
              }
              images={c[target]}
              change={(items) => set(target, items)}
              picker={picturePicker(
                `Add photograph to ${target === "hero" ? "hero slideshow" : "gallery wall"}`,
                null,
                (p) => {
                  if (p) set(target, [...c[target], p]);
                },
              )}
              upload={uploadControl(target)}
            />
          ))}
        </div>
      </div>
    );
  const items = c[reviewKind],
    index = Math.min(selected, Math.max(0, items.length - 1)),
    item = items[index];
  return (
    <div className="content-workspace">
      <div className="content-section-bar">
        <div className="toolbar">
          <button
            className={`button small ${reviewKind === "reviews" ? "gold" : ""}`}
            aria-pressed={reviewKind === "reviews"}
            onClick={() => setReviewKind("reviews")}
          >
            Reviews ({c.reviews.length})
          </button>
          <button
            className={`button small ${reviewKind === "faqs" ? "gold" : ""}`}
            aria-pressed={reviewKind === "faqs"}
            onClick={() => setReviewKind("faqs")}
          >
            FAQs ({c.faqs.length})
          </button>
        </div>
        <Toggle
          label="Show reviews section and navigation"
          value={c.reviewsVisible}
          change={(v) => set("reviewsVisible", v)}
        />
      </div>
      <div className="content-master-detail">
        <RecordList
          items={items.map((r) => ({
            title: "name" in r ? r.name : r.question,
            subtitle: "quote" in r ? r.quote : r.answer,
          }))}
          selected={index}
          select={setSelected}
          addLabel={reviewKind === "reviews" ? "Add review" : "Add FAQ"}
          add={() => {
            if (reviewKind === "reviews")
              set("reviews", [
                ...c.reviews,
                { name: "New review", quote: "", sample: false },
              ]);
            else
              set("faqs", [
                ...c.faqs,
                { question: "New question", answer: "" },
              ]);
            setSelected(items.length);
          }}
        />
        <div className="content-detail">
          {item ? (
            reviewKind === "reviews" && "quote" in item ? (
              <>
                <Field
                  label="Display name / attribution"
                  value={item.name}
                  change={(name) =>
                    set(
                      "reviews",
                      c.reviews.map((r, n) =>
                        n === index ? { ...r, name } : r,
                      ),
                    )
                  }
                />
                <Field
                  label="Review quotation"
                  value={item.quote}
                  area
                  change={(quote) =>
                    set(
                      "reviews",
                      c.reviews.map((r, n) =>
                        n === index ? { ...r, quote } : r,
                      ),
                    )
                  }
                />
                <Toggle
                  label="Sample / fictional content (must remain labelled)"
                  value={item.sample}
                  change={(sample) =>
                    set(
                      "reviews",
                      c.reviews.map((r, n) =>
                        n === index ? { ...r, sample } : r,
                      ),
                    )
                  }
                />
              </>
            ) : "question" in item ? (
              <>
                <Field
                  label="Question"
                  value={item.question}
                  change={(question) =>
                    set(
                      "faqs",
                      c.faqs.map((f, n) =>
                        n === index ? { ...f, question } : f,
                      ),
                    )
                  }
                />
                <Field
                  label="Answer"
                  value={item.answer}
                  area
                  change={(answer) =>
                    set(
                      "faqs",
                      c.faqs.map((f, n) =>
                        n === index ? { ...f, answer } : f,
                      ),
                    )
                  }
                />
              </>
            ) : null
          ) : (
            <p className="empty">
              Add your first {reviewKind === "reviews" ? "review" : "FAQ"}.
            </p>
          )}
          {item && (
            <button
              className="button small"
              onClick={() => {
                if (reviewKind === "reviews")
                  set(
                    "reviews",
                    c.reviews.filter((_, n) => n !== index),
                  );
                else
                  set(
                    "faqs",
                    c.faqs.filter((_, n) => n !== index),
                  );
                setSelected(Math.max(0, index - 1));
              }}
            >
              Remove {reviewKind === "reviews" ? "review" : "FAQ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function ImageCollection({
  title,
  images,
  change,
  picker,
  upload,
}: {
  title: string;
  images: Placement[];
  change: (items: Placement[]) => void;
  picker: React.ReactNode;
  upload: React.ReactNode;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  const move = (n: number, offset: number) => {
    const next = [...images];
    [next[n], next[n + offset]] = [next[n + offset], next[n]];
    change(next);
  };

  return (
    <section className="content-image-collection">
      <div className="content-section-bar">
        <h3>
          {title} <span className="admin-count">{images.length}</span>
        </h3>
        {upload}
      </div>
      {picker}
      <div className="content-image-vertical-scroll">
        <div className="content-image-grid compact-thumbnails">
          {images.map((p, n) => (
            <div className="content-image-card" key={p.id + "-" + n}>
              <div className="content-image-thumb">
                <img src={`/api/media/${p.id}?draft=1&w=400`} alt={p.alt} loading="lazy" />
                <span className="thumb-badge">#{n + 1}</span>
              </div>
              <div className="content-image-controls">
                <button
                  className="button small"
                  title="Edit alternative text"
                  onClick={() => setEditing(editing === n ? null : n)}
                >
                  Alt
                </button>
                <button
                  className="button small icon-only"
                  disabled={n === 0}
                  aria-label={`Move ${title} photograph ${n + 1} earlier`}
                  onClick={() => move(n, -1)}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  className="button small icon-only"
                  disabled={n === images.length - 1}
                  aria-label={`Move ${title} photograph ${n + 1} later`}
                  onClick={() => move(n, 1)}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  className="button small icon-only remove-btn"
                  aria-label={`Remove ${title} photograph ${n + 1}`}
                  onClick={() => change(images.filter((_, i) => i !== n))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {editing === n && (
                <Field
                  label={`Alt text #${n + 1}`}
                  value={p.alt}
                  change={(alt) =>
                    change(
                      images.map((item, i) =>
                        i === n ? { ...item, alt } : item,
                      ),
                    )
                  }
                />
              )}
            </div>
          ))}
        </div>
        {!images.length && (
          <p className="empty" style={{ width: "100%", padding: 25, margin: 0 }}>
            Upload photographs or choose existing ones above.
          </p>
        )}
      </div>
    </section>
  );
}
