"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  Camera,
  Aperture,
  Plus,
  Minus,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  X,
  Send,
} from "lucide-react";
import type { Content } from "@/lib/content";
import { api, money } from "./api";
type Placement = { id: string; alt: string; desktop: number; mobile: number };
export function Photo({
  asset,
  hero = false,
  preview = false,
  className = "",
}: {
  asset: Placement;
  hero?: boolean;
  preview?: boolean;
  className?: string;
}) {
  return (
    <img
      className={"photo " + className}
      src={`/api/media/${asset.id}?w=${hero ? 1600 : 640}${preview ? "&draft=1" : ""}`}
      srcSet={[400, 800, 1200, 1600]
        .map(
          (w) =>
            `/api/media/${asset.id}?w=${w}${preview ? "&draft=1" : ""} ${w}w`,
        )
        .join(", ")}
      sizes={hero ? "100vw" : "(max-width: 640px) 75vw, 40vw"}
      alt={asset.alt}
      style={
        {
          "--crop-desktop": asset.desktop + "%",
          "--crop-mobile": asset.mobile + "%",
        } as React.CSSProperties
      }
      loading={hero ? "eager" : "lazy"}
      fetchPriority={hero ? "high" : "auto"}
      decoding="async"
    />
  );
}
function Chat({ email }: { email: string }) {
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState("Loading"),
    [messages, setMessages] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    const refresh = () =>
      api("chat")
        .then((d) => {
          if (live) {
            setStatus(d.status);
            setMessages(d.messages);
          }
        })
        .catch(() => {
          if (live) setStatus("Connection unavailable");
        });
    void refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, [open]);
  return (
    <>
      <button
        className="chat-launch"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Chat with the studio"}
      >
        {open ? <X size={21} /> : <MessageCircle size={21} />}
      </button>
      {open && (
        <aside className="chat-panel glass" aria-label="Website chat">
          <div className="chat-title">
            <Aperture size={20} />
            <div>
              <strong>LET’S TALK</strong>
              <small>THE STUDIO · LEICESTER</small>
            </div>
            <button
              className="icon"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <p className="muted">
            {status === "Configured · awaiting Telegram"
              ? "Leave a message. We’ll reply here when available."
              : status + " · Please email the studio."}
          </p>
          {status !== "Configured · awaiting Telegram" ? (
            <a className="button" href={`mailto:${email}`}>
              <Mail size={16} /> Email the studio
            </a>
          ) : (
            <>
              <div className="messages" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={"bubble " + m.sender}>
                    <p>{m.body}</p>
                    <small>
                      {m.sender === "team"
                        ? "Studio"
                        : m.state === "failed"
                          ? "Delivery failed"
                          : m.state === "queued"
                            ? "Sending to team…"
                            : "Sent · awaiting reply"}
                    </small>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSending(true);
                  setError("");
                  try {
                    await api("chat", { message });
                    setMessage("");
                    const d = await api("chat");
                    setMessages(d.messages);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <label htmlFor="chat-message">Your message</label>
                <div className="input-row">
                  <input
                    id="chat-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  <button
                    className="button"
                    aria-label="Send message"
                    disabled={sending}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </aside>
      )}
    </>
  );
}
function Headline({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <h2 className={className}>
      {text.split("\n").map((line, n) => (
        <span key={n} className={n ? "muted" : ""} style={{ display: "block" }}>
          {line}
        </span>
      ))}
    </h2>
  );
}
export default function Portfolio({
  content: c,
  preview = false,
}: {
  content: Content;
  preview?: boolean;
}) {
  const sections = [
    { id: "home", label: "Home" },
    { id: "team", label: "Team" },
    { id: "gallery", label: "Gallery" },
    ...(c.packagesVisible ? [{ id: "packages", label: "Packages" }] : []),
    ...(c.reviewsVisible && c.reviews.length
      ? [{ id: "reviews", label: "Reviews" }]
      : []),
    { id: "contact", label: "Contact" },
  ];
  const [active, setActive] = useState(0),
    [focusPosition, setFocusPosition] = useState(0),
    [slide, setSlide] = useState(0),
    [tab, setTab] = useState(0),
    [menu, setMenu] = useState(false);
  const packages = c.packages.filter((p) => p.visible && !p.archived);
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.45;
      const tops = sections.map(
        (s) => document.getElementById(s.id)?.getBoundingClientRect().top ?? 0,
      );
      let index = 0;
      for (let n = 0; n < tops.length; n++) if (tops[n] <= line) index = n;
      const next = tops[index + 1];
      const progress =
        next !== undefined
          ? Math.max(
              0,
              Math.min(1, (line - tops[index]) / (next - tops[index])),
            )
          : 0;
      setActive(index);
      setFocusPosition(index + progress);
    };
    let frame = 0;
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", scroll);
    return () => {
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
    };
  }, [c.packagesVisible, c.reviewsVisible, c.reviews.length]);
  useEffect(() => {
    if (
      c.hero.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(() => setSlide((n) => (n + 1) % c.hero.length), 7500);
    return () => clearInterval(t);
  }, [c.hero.length]);
  return (
    <>
      <div className="portfolio-scroll">
        <header className="site-header">
          <a className="brand" href="#home">
            <span className="brand-mark">
              {c.logo || "CC"}
              <span className="brand-corner" />
            </span>
            <span>
              {c.brand.toUpperCase()}
              <small>PHOTOGRAPHY · LEICESTER</small>
            </span>
          </a>
          <button
            className="mobile-menu icon"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <span>{menu ? "CLOSE" : "MENU"}</span>
          </button>
          <nav className={menu ? "open" : ""} aria-label="Main navigation">
            {sections.slice(1).map((s, n) => (
              <a
                key={s.id}
                className={active === n + 1 ? "active" : ""}
                href={"#" + s.id}
                onClick={() => setMenu(false)}
              >
                {s.label}
              </a>
            ))}
            <a className="client-link" href="/client">
              Client login <ArrowUpRight size={13} />
            </a>
          </nav>
          <a
            className="button small header-book"
            href={c.packagesVisible ? "/book" : "#contact"}
          >
            {c.packagesVisible ? "BOOK A SESSION" : "GET IN TOUCH"}
            <ArrowUpRight size={15} />
          </a>
        </header>
        <main id="main">
          <section id="home" className="hero">
            {c.hero.map((a, n) => (
              <div
                key={a.id}
                className={"hero-slide " + (slide === n ? "visible" : "")}
                aria-hidden={slide !== n}
              >
                {(n === 0 ||
                  n === slide ||
                  n === (slide + 1) % c.hero.length) && (
                  <Photo asset={a} hero={n === 0} preview={preview} />
                )}
              </div>
            ))}
            <div className="hero-shade" />
            <div className="hero-copy">
              <p className="eyebrow">
                <span /> {c.copy.heroEyebrow}
              </p>
              <h1>
                {c.headline.split("\n").map((line, n) => (
                  <span key={n} className={n === 1 ? "outline" : ""}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="hero-description">{c.description}</p>
              <a
                className="button gold"
                href={c.packagesVisible ? "/book" : "#contact"}
              >
                {c.packagesVisible ? "BOOK A SESSION" : "LET’S TALK"}
                <ArrowUpRight size={19} />
              </a>
            </div>
            <div className="hero-foot">
              <a className="scroll-cue" href="#team">
                <ArrowDown size={15} /> SCROLL TO DISCOVER
              </a>
              <span className="hero-coordinate">
                52°38′ N &nbsp; 1°08′ W &nbsp; / &nbsp; LEICESTER, UK
              </span>
              <div className="slide-count">
                <span>{String(slide + 1).padStart(2, "0")}</span>
                <i /> {String(c.hero.length).padStart(2, "0")}
              </div>
            </div>
          </section>
          <section id="team" className="section team-section">
            <div className="section-heading">
              <p className="eyebrow">01 / BEHIND THE LENS</p>
              <Headline text={c.copy.teamTitle} />
            </div>
            <div
              className={
                "team-layout" +
                (c.team.length !== 2 ? " team-layout-flexible" : "")
              }
            >
              {c.team.map((t, n) => (
                <div className={"team-member member-" + n} key={n}>
                  <div className="portrait-ring">
                    {t.portrait ? (
                      <Photo asset={t.portrait} preview={preview} />
                    ) : (
                      <Camera size={50} />
                    )}
                  </div>
                  <h3>{t.name}</h3>
                  <p>{t.role}</p>
                  {t.sample && (
                    <small className="demo-label">
                      PLACEHOLDER IDENTITY & PORTRAIT
                    </small>
                  )}
                </div>
              ))}
              <div className="team-quote">
                <Aperture size={28} />
                <p>{c.teamQuote}</p>
                <span className="fine-line" />
              </div>
            </div>
          </section>
          <section id="gallery" className="gallery-section">
            <div className="section gallery-heading">
              <div>
                <p className="eyebrow">02 / THE CHAPTERS WE CAPTURE</p>
                <Headline text={c.copy.galleryTitle} />
              </div>
              <p className="muted narrow">{c.copy.galleryDescription}</p>
            </div>
            <div className="photo-wall" aria-label="Photography portfolio">
              {[0, 1, 2, 3].map((row) => (
                <div className={"wall-row row-" + row} key={row}>
                  <div className="wall-track">
                    {[0, 1].map((copy) => (
                      <div
                        className="wall-set"
                        key={copy}
                        aria-hidden={copy === 1}
                      >
                        {c.wall.map((a, n) => (
                          <div
                            className={"wall-image aspect-" + ((n + row) % 3)}
                            key={a.id}
                          >
                            <Photo
                              asset={c.wall[(n + row) % c.wall.length]}
                              preview={preview}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {c.demo && (
              <p className="sample-media">
                DEVELOPMENT PORTFOLIO · SAMPLE PHOTOGRAPHS FROM UNSPLASH
              </p>
            )}
          </section>
          {c.packagesVisible && (
            <section id="packages" className="section packages-section">
              <div className="section-heading centered">
                <p className="eyebrow">03 / MAKE TIME FOR YOUR STORY</p>
                <Headline text={c.copy.packagesTitle} />
                <p className="muted">{c.copy.packagesDescription}</p>
                {c.demo && (
                  <p className="demo-label">
                    DEMO PRICES & INCLUSIONS · SUBJECT TO BUSINESS REVIEW
                  </p>
                )}
              </div>
              <div
                className="package-tabs"
                role="tablist"
                aria-label="Session durations"
              >
                {packages.map((p, n) => (
                  <button
                    key={p.id}
                    id={"tab-" + n}
                    role="tab"
                    aria-selected={tab === n}
                    aria-controls={"package-" + n}
                    tabIndex={tab === n ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        const next =
                          (n +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            packages.length) %
                          packages.length;
                        setTab(next);
                        document.getElementById("tab-" + next)?.focus();
                      }
                    }}
                    onClick={() => setTab(n)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="packages-grid">
                {packages.map((p, n) => (
                  <article
                    key={p.id}
                    id={"package-" + n}
                    aria-labelledby={"package-title-" + n}
                    className={
                      "package-card glass " +
                      (n === tab ? "selected " : "") +
                      (n === 1 ? "featured" : "")
                    }
                  >
                    {p.image && (
                      <div className="package-background">
                        <img
                          src={`/api/media/${p.image}?w=640${preview ? "&draft=1" : ""}`}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="package-top">
                      <span className="eyebrow">
                        CHAPTER {String(n + 1).padStart(2, "0")}
                      </span>
                      <Aperture size={22} />
                    </div>
                    <h3 id={"package-title-" + n}>{p.name.toUpperCase()}</h3>
                    <p className="package-description">{p.description}</p>
                    <div className="price">
                      {money(p.price)}
                      <small>{p.duration / 60} HOURS OF COVERAGE</small>
                    </div>
                    <div className="package-line" />
                    <ul>
                      {p.inclusions.map((i, n) => (
                        <li key={n}>
                          <Check size={14} />
                          {i}
                        </li>
                      ))}
                      <li>
                        <Check size={14} />
                        Up to {p.allowance} edited photographs
                      </li>
                    </ul>
                    <p className="delivery">{p.delivery}</p>
                    {p.accepting ? (
                      <a
                        className={"button full " + (n === 1 ? "gold" : "")}
                        href={"/book?package=" + p.id}
                      >
                        REQUEST THIS CHAPTER
                        <ArrowUpRight size={16} />
                      </a>
                    ) : (
                      <p className="badge">Not accepting requests</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
          {c.reviewsVisible && c.reviews.length > 0 && (
            <section id="reviews" className="section reviews-section">
              <p className="eyebrow">
                {String(sections.findIndex((s) => s.id === "reviews")).padStart(
                  2,
                  "0",
                )}{" "}
                / WORDS TO KEEP
              </p>
              <Headline text={c.copy.reviewsTitle} />
              <div className="reviews-grid">
                {c.reviews.map((r, n) => (
                  <figure key={n}>
                    <span className="quote-mark">“</span>
                    <blockquote>{r.quote}</blockquote>
                    <figcaption>
                      <span className="fine-line" />
                      {r.name}
                      {r.sample && (
                        <small>SAMPLE CONTENT · FICTIONAL TESTIMONIAL</small>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          <section id="contact" className="section contact-section">
            <div className="process">
              <p className="eyebrow">FROM A HELLO TO A HEIRLOOM</p>
              <div className="process-grid">
                {["Request", "Confirmation", "Session", "Gallery delivery"].map(
                  (label, n) => (
                    <div key={label}>
                      <span>0{n + 1}</span>
                      <h3>{label}</h3>
                      {n < 3 && <ArrowUpRight size={18} />}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="contact-grid">
              <div>
                <p className="eyebrow">LET’S CREATE SOMETHING YOU’LL KEEP</p>
                <Headline text={c.copy.contactTitle} />
                <p className="muted">{c.copy.contactDescription}</p>
                <a className="button gold" href={`mailto:${c.email}`}>
                  SAY HELLO
                  <ArrowUpRight size={17} />
                </a>
                <div className="contact-details">
                  <a href={`mailto:${c.email}`}>
                    <Mail size={15} />
                    {c.email}
                  </a>
                  <span>
                    <MapPin size={15} />
                    {c.address}
                  </span>
                  <span>{c.phone}</span>
                </div>
              </div>
              <div className="faq">
                <p className="eyebrow">A FEW THINGS YOU MAY BE WONDERING</p>
                {c.faqs.map((f, n) => (
                  <details key={n}>
                    <summary>
                      {f.question}
                      <Plus size={17} className="faq-plus" />
                      <Minus size={17} className="faq-minus" />
                    </summary>
                    <p>{f.answer}</p>
                  </details>
                ))}
                <div className="client-note glass">
                  <Aperture size={26} />
                  <div>
                    <h3>A CHAPTER ALREADY CAPTURED?</h3>
                    <p className="muted">{c.deliveryCopy}</p>
                    <a href="/client">
                      OPEN YOUR CLIENT GALLERY <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <footer className="site-footer">
          <a className="brand" href="#home">
            <span className="brand-mark">{c.logo}</span>
            {c.brand.toUpperCase()}
          </a>
          <p>{c.copy.footerTagline}</p>
          <div>
            {c.socials.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ))}
            <a href="/policies/privacy">Privacy</a>
            <a href="/policies/terms">Terms</a>
            <a href="/admin">Studio admin</a>
          </div>
          <small>
            © {new Date().getFullYear()} {c.brand}
            {c.demo ? " · Development preview" : ""}
          </small>
        </footer>
      </div>
      <aside
        className="focus-rail"
        aria-label={`Current section: ${sections[active]?.label}, ${active + 1} of ${sections.length}`}
      >
        <div className="lens-ticks">
          {Array.from({ length: 41 }, (_, n) => (
            <i className={n % 5 === 0 ? "major" : ""} key={n} />
          ))}
        </div>
        <div className="lens-label-window">
          <div
            className="lens-labels"
            style={{
              transform: `translateY(calc(50% - ${focusPosition * 66 + 33}px))`,
            }}
          >
            {sections.map((s, n) => (
              <a
                className={n === active ? "active" : ""}
                href={"#" + s.id}
                key={s.id}
              >
                {s.label.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
        <span className="focus-pointer" />
        <div className="focus-mobile">
          <span>{sections[active]?.label.toUpperCase()}</span>
          <small>
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(sections.length).padStart(2, "0")}
          </small>
        </div>
      </aside>
      <Chat email={c.email} />
    </>
  );
}
