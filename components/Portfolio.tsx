"use client";
import { useEffect, useState, useRef } from "react";
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
  Phone,
  MessageCircle,
  X,
  Send,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Images,
  Home,
  Users,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Content } from "@/lib/content";
import { api, money } from "./api";

type Placement = { id: string; alt: string; desktop: number; mobile: number };

function PackageOffer({ price, originalPrice }: { price: number; originalPrice: number }) {
  if (originalPrice <= price) return null;
  return (
    <span className="package-offer">
      <span><span className="sr-only">Original price </span><s>{money(originalPrice)}</s></span>
      <span className="package-offer-badge">SALE · SAVE {money(originalPrice - price)}</span>
    </span>
  );
}

export function Photo({
  asset,
  hero = false,
  preview = false,
  className = "",
  style,
}: {
  asset: Placement;
  hero?: boolean;
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const defaultWidth = hero ? 3840 : 1200;
  const widths = hero
    ? [1600, 2048, 2560, 3200, 3840, 4800]
    : [400, 800, 1200, 1600];

  return (
    <img
      className={"photo " + className}
      src={`/api/media/${asset.id}?w=${defaultWidth}${preview ? "&draft=1" : ""}`}
      srcSet={widths
        .map(
          (w) =>
            `/api/media/${asset.id}?w=${w}${preview ? "&draft=1" : ""} ${w}w`,
        )
        .join(", ")}
      sizes={hero ? "100vw" : "(max-width: 767px) 30vw, 25vw"}
      alt={/^(?:DSC|IMG|\d|202\d)/i.test(asset.alt) ? "Cinematic Chapters portfolio photograph" : asset.alt}
      style={
        {
          "--crop-desktop": asset.desktop + "%",
          "--crop-mobile": asset.mobile + "%",
          ...style,
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
    { id: "gallery", label: "Gallery" },
    ...(c.packagesVisible ? [{ id: "packages", label: "Packages" }] : []),
    { id: "team", label: "About Us" },
    { id: "contact", label: "Enquire" },
  ];

  /*
   * Desktop presents the sections in their original order (Team → Gallery →
   * Packages → Contact) using CSS `order` above the mobile breakpoint. The
   * mobile list above is deliberately untouched, so the two layouts track
   * their active section independently.
   */
  const deskSections = [
    { id: "home", label: "Home" },
    { id: "team", label: "Team" },
    { id: "gallery", label: "Gallery" },
    ...(c.packagesVisible ? [{ id: "packages", label: "Packages" }] : []),
    { id: "contact", label: "Contact" },
  ];

  const [active, setActive] = useState(0),
    [deskActive, setDeskActive] = useState(0),
    [focusPosition, setFocusPosition] = useState(0),

    [slide, setSlide] = useState(0),
    [tab, setTab] = useState(0),
    [menu, setMenu] = useState(false),
    [expandedPackage, setExpandedPackage] = useState<string | null>(null),
    [viewingIndex, setViewingIndex] = useState<number | null>(null),
    [touchStartX, setTouchStartX] = useState<number | null>(null);

  const packages = c.packages.filter((p) => p.visible && !p.archived);
  const largestSaleSaving = Math.max(0, ...packages.map(p =>
    (p.originalPrice ?? Math.ceil(p.price / 0.8 / 1000) * 1000) - p.price,
  ));
  const heroIds = new Set(c.hero.map((h) => h.id));
  const seenWall = new Set<string>();
  const uniqueWallPhotos: Placement[] = [];
  for (const item of c.wall) {
    if (!heroIds.has(item.id) && !seenWall.has(item.id)) {
      seenWall.add(item.id);
      uniqueWallPhotos.push(item);
    }
  }

  const displayPhotos =
    uniqueWallPhotos.length >= 3
      ? uniqueWallPhotos
      : Array.from(new Map(c.wall.map((item) => [item.id, item])).values());

  // Give every photo one row, so rows never show the same photo together.
  const galleryRowCount = Math.max(1, Math.min(3, Math.floor(displayPhotos.length / 6)));
  const galleryRows = Array.from({ length: galleryRowCount }, (_, r) =>
    displayPhotos.filter((_, n) => n % galleryRowCount === r),
  );
  const galleryMoves = displayPhotos.length >= 6;


  const dialogRef = useRef<HTMLDivElement>(null);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [hoveredPhoto, setHoveredPhoto] = useState<Placement | null>(null);
  const [mobileFocusPosition, setMobileFocusPosition] = useState(0);
  const viewingAsset = viewingIndex !== null ? displayPhotos[viewingIndex] : null;

  const showPrev = () => {
    if (viewingIndex !== null) {
      setViewingIndex((viewingIndex - 1 + displayPhotos.length) % displayPhotos.length);
    }
  };

  const showNext = () => {
    if (viewingIndex !== null) {
      setViewingIndex((viewingIndex + 1) % displayPhotos.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) showNext();
      else showPrev();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    document.documentElement.classList.add("snap-container");
    return () => {
      document.documentElement.classList.remove("snap-container");
    };
  }, []);

  useEffect(() => {
    if (viewingIndex === null) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const background = Array.from(document.body.children).filter(el => !el.contains(dialog)) as HTMLElement[];
    const inertBefore = background.map(el => el.inert);
    background.forEach(el => { el.inert = true; });
    const scrollBefore = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const controls = Array.from(dialog?.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']") || []).filter(el => el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (!dialog?.contains(document.activeElement) || (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
          e.preventDefault(); (e.shiftKey ? last : first)?.focus();
        }
      }
      if (e.key === "Escape") setViewingIndex(null);
      else if (e.key === "ArrowLeft") setViewingIndex(index => index === null ? null : (index - 1 + displayPhotos.length) % displayPhotos.length);
      else if (e.key === "ArrowRight") setViewingIndex(index => index === null ? null : (index + 1) % displayPhotos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      background.forEach((el, i) => { el.inert = inertBefore[i]; });
      document.documentElement.style.overflow = scrollBefore;
      previous?.focus();
    };
  }, [viewingIndex !== null]);

  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.45;
      // Mobile order (bottom navigation, mobile menu).
      const tops = sections.map(
        (s) => document.getElementById(s.id)?.getBoundingClientRect().top ?? 0,
      );
      let activeIndex = 0;
      for (let n = 0; n < tops.length; n++)
        if (tops[n] <= line) activeIndex = n;
      setActive(activeIndex);
      const nextTop = tops[activeIndex + 1];
      const mobileProgress = nextTop !== undefined
        ? Math.max(0, Math.min(1, (line - tops[activeIndex]) / (nextTop - tops[activeIndex])))
        : 0;
      setMobileFocusPosition(activeIndex + mobileProgress);

      // Desktop order (header navigation and focus rail), as originally built.
      const deskTops = deskSections.map(
        (s) => document.getElementById(s.id)?.getBoundingClientRect().top ?? 0,
      );
      let deskIndex = 0;
      for (let n = 0; n < deskTops.length; n++)
        if (deskTops[n] <= line) deskIndex = n;
      const deskNext = deskTops[deskIndex + 1];
      const progress =
        deskNext !== undefined
          ? Math.max(
              0,
              Math.min(
                1,
                (line - deskTops[deskIndex]) / (deskNext - deskTops[deskIndex]),
              ),
            )
          : 0;
      setDeskActive(deskIndex);
      setFocusPosition(deskIndex + progress);
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
            <span className="brand-text">
              <strong>{c.brand.toUpperCase()}</strong>
              <small>PHOTOGRAPHY · LEICESTER</small>
            </span>
          </a>

          <div className="header-mobile-controls">
            <button
              className="mobile-menu icon"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <span>{menu ? "CLOSE" : "MENU"}</span>
            </button>
          </div>

          <nav
            className={"mobile-site-nav" + (menu ? " open" : "")}
            aria-label="Main navigation"
          >
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
            <a className="client-link" href="/client" onClick={() => setMenu(false)}>
              Client login <ArrowUpRight size={13} />
            </a>
          </nav>

          {/* Desktop navigation (original order and labels; hidden on mobile) */}
          <nav className="desktop-site-nav desktop-only" aria-label="Main navigation">
            {deskSections.slice(1).map((s, n) => (
              <a
                key={s.id}
                className={deskActive === n + 1 ? "active" : ""}
                href={"#" + s.id}
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
          {/* =================================================================
              1. HERO SECTION
             ================================================================= */}
          <section
            id="home"
            className="hero"
            style={
              {
                "--banner-split": `${c.banner?.split ?? 38}%`,
                "--banner-fade-1": `${(c.banner?.split ?? 38) + 8}%`,
                "--banner-fade-2": `${(c.banner?.split ?? 38) + 18}%`,
                "--banner-fade-3": `${(c.banner?.split ?? 38) + 32}%`,
              } as React.CSSProperties
            }
          >
            {c.hero.map((a, n) => (
              <div
                key={a.id}
                className={"hero-slide " + (slide === n ? "visible" : "")}
                aria-hidden={slide !== n}
              >
                {(n === 0 ||
                  n === slide ||
                  n === (slide + 1) % c.hero.length) && (
                  <Photo
                    asset={a}
                    hero={true}
                    preview={preview}
                    style={
                      {
                        "--banner-zoom": `${(c.banner?.zoom ?? 100) / 100}`,
                        "--banner-pos-x": `${c.banner?.positionX ?? 50}%`,
                        "--banner-pos-y": `${c.banner?.positionY ?? 50}%`,
                        objectPosition: `${c.banner?.positionX ?? 50}% ${c.banner?.positionY ?? 50}%`,
                        transformOrigin: `${c.banner?.positionX ?? 50}% ${c.banner?.positionY ?? 50}%`,
                      } as React.CSSProperties
                    }
                  />
                )}
              </div>
            ))}
            <div className="hero-shade" />

            <div className="hero-copy">
              <p className="eyebrow">
                <span /> {c.copy.heroEyebrow}
              </p>
              <h1 className="hero-headline">
                {c.headline.split("\n").map((line, n) => (
                  <span
                    key={n}
                    className={
                      "hero-title-line" + (n === 1 ? " desktop-outline" : "")
                    }
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p className="hero-description">{c.description}</p>
              {c.sale.enabled && c.packagesVisible && (
                <a className="hero-sale-notice" href="#packages">
                  <span className="hero-sale-stamp">SALE</span>
                  <span className="hero-sale-details">
                    <strong>{largestSaleSaving > 0
                      ? `Save up to ${money(largestSaleSaving)}`
                      : "Explore our package offers"}</strong>
                    <span>{c.sale.bannerText}</span>
                  </span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </a>
              )}
              <div className="hero-cta-group">
                <a
                  className="button gold hero-cta-btn"
                  href={c.packagesVisible ? "/book" : "#contact"}
                >
                  BOOK A SESSION
                  <ArrowUpRight size={18} />
                </a>
                <a className="mobile-scroll-hint vp-mobile" href="#gallery">
                  <ArrowDown size={14} /> View our gallery
                </a>
              </div>
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

          {/* =================================================================
              2. GALLERY PREVIEW (Curated still 2-column on mobile, moving on desktop)
             ================================================================= */}
          <section id="gallery" className="gallery-section">
            <div className="section gallery-heading">
              <div>
                <p className="eyebrow">
                  <bdi className="vp-mobile">01</bdi>
                  <bdi className="desktop-only">02</bdi> / THE CHAPTERS WE
                  CAPTURE
                </p>

                <Headline text={c.copy.galleryTitle} />
              </div>
              <p className="muted narrow">{c.copy.galleryDescription}</p>
            </div>

            {/* Desktop Animated Continuous Wall */}
            <div className={"photo-wall desktop-only" + (galleryPaused ? " is-paused" : "") + (!galleryMoves ? " is-static" : "")} aria-label="Photography portfolio">
              {galleryRows.map((rowPhotos, r) => (
                <div className={`wall-row row-${r}`} key={r}>
                  <div className="wall-track">
                    {(galleryMoves ? [0, 1] : [0]).map((copyIndex) => (
                      <div
                        className="wall-set"
                        key={copyIndex}
                        aria-hidden={copyIndex === 1}
                      >
                        {rowPhotos.map((a, n) => (
                          <button
                            type="button"
                            tabIndex={copyIndex === 1 ? -1 : 0}
                            aria-label={`View photograph ${displayPhotos.findIndex(photo => photo.id === a.id) + 1}`}
                            onPointerEnter={(event) => {
                              if (event.pointerType === "mouse") setHoveredPhoto(a);
                            }}
                            onPointerLeave={() => setHoveredPhoto(null)}
                            onClick={() => {
                              setHoveredPhoto(null);
                              setViewingIndex(displayPhotos.findIndex(photo => photo.id === a.id));
                            }}
                            className={"wall-image aspect-" + ((n + r) % 3)}
                            key={`${copyIndex}-${a.id}`}
                          >
                            <Photo asset={a} preview={preview} />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {galleryMoves && <button type="button" className="button gallery-pause desktop-only" aria-pressed={galleryPaused} onClick={() => setGalleryPaused(!galleryPaused)}>{galleryPaused ? "Resume gallery movement" : "Pause gallery movement"}</button>}
            {/* Mobile Curated 3-Column Compact Grid (~9 Photos) */}
            <div className="mobile-gallery-preview mobile-only" aria-label="Curated photography preview">
              <div className="mobile-gallery-grid">
                {displayPhotos.slice(0, 9).map((a, n) => (
                  <button
                    type="button"
                    key={a.id}
                    className="mobile-gallery-card"
                    onClick={() => setViewingIndex(n)}
                    aria-label={`View full photograph: ${a.alt}`}
                  >
                    <Photo asset={a} preview={preview} />
                    <span className="mobile-gallery-zoom" aria-hidden="true">
                      <ZoomIn size={13} />
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="button full mobile-gallery-explore-btn"
                onClick={() => setViewingIndex(0)}
              >
                <Images size={15} />
                EXPLORE ALL {displayPhotos.length} FRAMES
              </button>
            </div>
          </section>

          {/* =================================================================
              3. PACKAGES (Vertical layout on mobile for clear comparison)
             ================================================================= */}
          {c.packagesVisible && (
            <section id="packages" className="section packages-section">
              <div className="section-heading centered">
                <p className="eyebrow">
                  <bdi className="vp-mobile">02 / CHOOSE YOUR CHAPTER</bdi>
                  <bdi className="desktop-only">
                    03 / MAKE TIME FOR YOUR STORY
                  </bdi>
                </p>

                <Headline text={c.copy.packagesTitle} />
                <p className="muted">{c.copy.packagesDescription}</p>
              </div>

              {/* Desktop Tabs */}
              <div
                className="package-tabs desktop-only"
                role="tablist"
                aria-label="Photography packages"
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

              {/* Desktop Packages Cards Container */}
              <div className="packages-grid desktop-only">
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
                      {c.sale.enabled && <PackageOffer price={p.price} originalPrice={p.originalPrice ?? Math.ceil(p.price / 0.8 / 1000) * 1000} />}
                      <span className="sr-only">{c.sale.enabled ? "Sale price " : "Price "}</span>
                      {money(p.price)}
                      <small>
                        UP TO{" "}
                        {p.duration === 90
                          ? "90 MINUTES"
                          : `${p.duration / 60} ${p.duration === 60 ? "HOUR" : "HOURS"}`}{" "}
                        OF PHOTOGRAPHY
                      </small>
                    </div>
                    <div className="package-line" />
                    <ul>
                      {p.inclusions.map((i, idx) => (
                        <li key={idx}>
                          <Check size={14} />
                          {i}
                        </li>
                      ))}
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

              {/* Mobile Packages: Compact Comparison Layout with All 3 Visible Together */}
              <div className="mobile-packages-wrapper mobile-only">
                <div className="mobile-packages-shared-note glass">
                  <Aperture size={15} />
                  <span>
                    All packages include one photographer, high-resolution digital downloads, a private online gallery, and 14-day turnaround. Second photographer, prints and extras quoted separately.
                  </span>
                </div>

                <div className="mobile-packages-list" role="list">
                  {packages.map((p, n) => {
                    const isExpanded = expandedPackage === p.id;
                    const durationText =
                      p.duration === 90
                        ? "Up to 90 mins"
                        : p.duration === 60
                          ? "Up to 1 hour"
                          : p.duration === 180
                            ? "Up to 3 hours"
                            : p.duration === 240
                              ? "Up to 4 hours"
                              : `Up to ${p.duration / 60} hours`;
                    const photosText = `${p.inclusions.some((item) => /^at least\b/i.test(item)) ? "At least " : ""}${p.allowance} edited photos`;

                    return (
                      <div
                        key={p.id}
                        className={`mobile-package-card ${isExpanded ? "expanded" : ""} ${n === 1 ? "featured" : ""}`}
                      >
                        {/* Compact Overview Row */}
                        <div className="mobile-package-summary">
                          <div className="mobile-package-header-row">
                            <div className="mobile-package-titles">
                              <span className="mobile-package-chapter">
                                CHAPTER 0{n + 1}
                              </span>
                              <h3 className="mobile-package-name">
                                {p.name.toUpperCase()}
                              </h3>
                            </div>
                            <div className="mobile-package-price-wrap">
                              {c.sale.enabled && <PackageOffer price={p.price} originalPrice={p.originalPrice ?? Math.ceil(p.price / 0.8 / 1000) * 1000} />}
                              <strong className="mobile-package-price">
                                <span className="sr-only">{c.sale.enabled ? "Sale price " : "Price "}</span>
                                {money(p.price)}
                              </strong>
                            </div>
                          </div>

                          <p className="mobile-package-type">{p.description}</p>

                          <div className="mobile-package-chips">
                            <span className="package-chip">
                              <Clock size={11} />
                              {durationText}
                            </span>
                            <span className="package-chip">
                              <Images size={11} />
                              {photosText}
                            </span>
                          </div>

                          <div className="mobile-package-actions">
                            <button
                              type="button"
                              className="mobile-package-toggle-btn"
                              onClick={() =>
                                setExpandedPackage(isExpanded ? null : p.id)
                              }
                              aria-expanded={isExpanded}
                              aria-controls={`package-details-${p.id}`}
                            >
                              <span>
                                {isExpanded ? "Hide details" : "View full details"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                            <a
                              className="button small gold mobile-package-enquire-btn"
                              href={`/book?package=${p.id}`}
                            >
                              ENQUIRE
                              <ArrowUpRight size={12} />
                            </a>
                          </div>
                        </div>

                        {/* Expandable Details & Complete Inclusions */}
                        {isExpanded && (
                          <div
                            id={`package-details-${p.id}`}
                            className="mobile-package-details"
                          >
                            <div className="details-subhead">
                              Package Inclusions:
                            </div>
                            <ul className="details-inclusions-list">
                              {p.inclusions.map((inc, i) => (
                                <li key={i}>
                                  <Check size={12} className="check-icon" />
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="details-terms-card">
                              <p className="details-delivery">
                                <strong>Delivery:</strong> {p.delivery}
                              </p>
                              <div className="details-terms-grid">
                                <div>• 25% deposit to reserve session date</div>
                                <div>• Balance due 7 days prior to session</div>
                                <div>• Travel included within Leicester</div>
                                <div>• Free outdoor bad-weather reschedule</div>
                              </div>
                            </div>

                            <a
                              className="button full gold details-cta"
                              href={`/book?package=${p.id}`}
                            >
                              REQUEST {p.name.toUpperCase()} · {money(p.price)}
                              <ArrowUpRight size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* =================================================================
              4. ABOUT US (Compact founder cards)
             ================================================================= */}
          <section id="team" className="section team-section">
            <span id="about" style={{ display: "block", position: "relative", top: "-80px", visibility: "hidden" }} />
            <div className="section-heading">
              <p className="eyebrow">
                <bdi className="vp-mobile">03 / ABOUT US</bdi>
                <bdi className="desktop-only">01 / BEHIND THE LENS</bdi>
              </p>

              <Headline text={c.copy.teamTitle} />
            </div>
            <div
              className={
                "team-layout" +
                (c.team.length !== 2 ? " team-layout-flexible" : "")
              }
            >
              <div className="team-members-grid">
                {c.team.map((t, n) => (
                  <div className={"team-member member-" + n} key={n}>
                    <div className="portrait-ring">
                      {t.portrait ? (
                        <Photo asset={t.portrait} preview={preview} />
                      ) : (
                        <Camera size={36} />
                      )}
                    </div>
                    <h3>{t.name}</h3>
                    <p>{t.role}</p>
                  </div>
                ))}
              </div>
              <div className="team-quote">
                <Aperture size={24} />
                <p>{c.teamQuote}</p>
                <span className="fine-line" />
              </div>
            </div>
          </section>

          {/* =================================================================
              5. BOOKING FAQ & CONTACT
             ================================================================= */}
          <section id="contact" className="section contact-section">
            {/* Real reviews only shown if preview=true and configured */}
            {preview && c.reviewsVisible && c.reviews.length > 0 && (
              <div className="section-reviews-block">
                <div className="reviews-heading">
                  <p className="eyebrow">WORDS TO KEEP</p>
                  <Headline text={c.copy.reviewsTitle} />
                </div>
                <div className="reviews-grid">
                  {c.reviews.map((r, n) => (
                    <figure key={n} className="review-card">
                      <div className="review-quote-wrap">
                        <span className="quote-mark">“</span>
                        <blockquote>{r.quote}</blockquote>
                      </div>
                      <figcaption>
                        <span className="fine-line" />
                        <span className="reviewer-name">{r.name}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            <div className="process">
              <p className="eyebrow">FROM A HELLO TO AN HEIRLOOM</p>
              <div className="process-grid">
                {["Request", "Confirmation", "Session", "Gallery delivery"].map(
                  (label, n) => (
                    <div key={label} className="process-step">
                      <span className="step-num">0{n + 1}</span>
                      <h3>{label}</h3>
                      {n < 3 && <ArrowUpRight size={14} className="step-arrow" />}
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

                <a
                  className="button gold desktop-only"
                  href={`mailto:${c.email}`}
                >
                  SAY HELLO
                  <ArrowUpRight size={17} />
                </a>

                {/* Mobile direct contact buttons */}
                <div className="mobile-contact-actions vp-mobile">

                  <a className="button gold full" href={`mailto:${c.email}`}>
                    <Mail size={16} />
                    EMAIL US
                  </a>
                  <a
                    className="button full"
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                  >
                    <Phone size={16} />
                    CALL {c.phone}
                  </a>
                  <a
                    className="button full"
                    href={c.socials.find(s => /facebook/i.test(s.label))?.url || "https://www.facebook.com/profile.php?id=61595201697677"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} />
                    MESSAGE ON FACEBOOK
                  </a>
                </div>

                <div className="contact-details">
                  <a href={`mailto:${c.email}`}>
                    <Mail size={15} />
                    {c.email}
                  </a>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                    <Phone size={15} />
                    {c.phone}
                  </a>
                  <span>
                    <MapPin size={15} />
                    {c.address}
                  </span>
                  <a
                    href={c.socials.find(s => /facebook/i.test(s.label))?.url || "https://www.facebook.com/profile.php?id=61595201697677"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                    Message our Facebook page
                  </a>
                </div>
              </div>

              <div className="faq desktop-only">
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

              {/* Mobile Booking Info Card (Replacing FAQ on Mobile) */}
              <div className="mobile-booking-info mobile-only">
                <details className="mobile-terms-card glass">
                  <summary>Booking details <span>25% deposit · Gallery within 14 days</span></summary>
                  <div className="mobile-terms-list">
                    <div className="mobile-term-item">
                      <strong>Deposit:</strong> A 25% deposit secures your date and is deducted from the total. The remaining balance is due on the session day.
                    </div>
                    <div className="mobile-term-item">
                      <strong>Turnaround:</strong> Private online gallery delivered within 14 days with high-resolution downloads.
                    </div>
                    <div className="mobile-term-item">
                      <strong>Travel:</strong> Included across Leicester; custom travel quotes available for locations further afield.
                    </div>
                    <div className="mobile-term-item">
                      <strong>Weather:</strong> Complimentary rescheduling for outdoor shoots affected by poor weather.
                    </div>
                    <div className="mobile-term-item">
                      <strong>Photographers:</strong> All packages include one photographer. A second photographer is quoted separately.
                    </div>
                  </div>
                </details>

                <div className="client-note glass">
                  <Aperture size={20} />
                  <div>
                    <h3>A CHAPTER ALREADY CAPTURED?</h3>
                    <p className="muted">{c.deliveryCopy}</p>
                    <a href="/client">
                      OPEN YOUR CLIENT GALLERY <ArrowUpRight size={14} />
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
          </small>
        </footer>
      </div>

      {/* Desktop Focus Rail (Hidden on mobile) */}
      <aside
        className="focus-rail desktop-only"
        aria-label={`Current section: ${deskSections[deskActive]?.label}, ${deskActive + 1} of ${deskSections.length}`}
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
            {deskSections.map((s, n) => (
              <a
                className={n === deskActive ? "active" : ""}
                href={"#" + s.id}
                key={s.id}
              >
                {s.label.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
        <span className="focus-pointer" />
      </aside>

      {/* App-Style Fixed Bottom Navigation Bar (Mobile-Only) */}
      <aside className="focus-rail mobile-focus-rail mobile-only" aria-hidden="true">
        <div className="lens-ticks" style={{ transform: `translateY(-${mobileFocusPosition * 22}px)` }}>
          {Array.from({ length: 61 }, (_, n) => (
            <i className={n % 5 === 0 ? "major" : ""} key={n} />
          ))}
        </div>
        <span className="focus-pointer" />
      </aside>
      <nav
        className="mobile-bottom-nav mobile-only"
        aria-label="Mobile bottom navigation"
      >
        <div className="mobile-bottom-nav-inner">
          <a
            href="#home"
            className={`bottom-nav-item ${sections[active]?.id === "home" ? "active" : ""}`}
            aria-label="Home"
          >
            <Home size={19} className="bottom-nav-icon" />
            <span className="bottom-nav-label">Home</span>
          </a>
          <a
            href="#gallery"
            className={`bottom-nav-item ${sections[active]?.id === "gallery" ? "active" : ""}`}
            aria-label="Gallery"
          >
            <Images size={19} className="bottom-nav-icon" />
            <span className="bottom-nav-label">Gallery</span>
          </a>
          {c.packagesVisible && (
            <a
              href="#packages"
              className={`bottom-nav-item ${sections[active]?.id === "packages" ? "active" : ""}`}
              aria-label="Packages"
            >
              <Sparkles size={19} className="bottom-nav-icon" />
              <span className="bottom-nav-label">Packages</span>
            </a>
          )}
          <a
            href="#team"
            className={`bottom-nav-item ${sections[active]?.id === "team" ? "active" : ""}`}
            aria-label="About"
          >
            <Users size={19} className="bottom-nav-icon" />
            <span className="bottom-nav-label">About</span>
          </a>
          <a
            href="#contact"
            className={`bottom-nav-item ${sections[active]?.id === "contact" ? "active" : ""}`}
            aria-label="Contact"
          >
            <Mail size={19} className="bottom-nav-icon" />
            <span className="bottom-nav-label">Contact</span>
          </a>
        </div>
      </nav>

      {/* Full-screen Lightbox Gallery Viewer with Touch Swipe & Nav Controls */}
      {hoveredPhoto && viewingIndex === null && (
        <div className="gallery-hover-preview" aria-hidden="true" key={hoveredPhoto.id}>
          <img
            src={`/api/media/${hoveredPhoto.id}?w=1600${preview ? "&draft=1" : ""}`}
            alt=""
          />
          <span>Click the photograph to explore your gallery</span>
        </div>
      )}
      {viewingAsset && viewingIndex !== null && (
        <div
          className="gallery-modal-overlay"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Full size photograph preview"
          onClick={() => setViewingIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="gallery-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gallery-modal-header">
              <span className="gallery-modal-counter">
                {viewingIndex + 1} / {displayPhotos.length}
              </span>
              <button
                type="button"
                className="gallery-modal-close"
                onClick={() => setViewingIndex(null)}
                aria-label="Close image preview"
              >
                <X size={22} />
              </button>
            </div>

            <div className="gallery-modal-image-wrapper">
              <button
                type="button"
                className="gallery-modal-nav prev desktop-only"
                onClick={showPrev}
                aria-label="Previous photograph"
              >
                <ChevronLeft size={32} />
              </button>
              <img
                src={`/api/media/${viewingAsset.id}?w=2560${preview ? "&draft=1" : ""}`}
                alt={/^(?:DSC|IMG|\d|202\d)/i.test(viewingAsset.alt) ? "Selected Cinematic Chapters portfolio photograph" : viewingAsset.alt}
                className="gallery-modal-img"
              />
              <button
                type="button"
                className="gallery-modal-nav next desktop-only"
                onClick={showNext}
                aria-label="Next photograph"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {viewingAsset.alt && !/^(?:DSC|IMG|\d|202\d)/i.test(viewingAsset.alt) && (
              <div className="gallery-modal-caption">
                <p>{viewingAsset.alt}</p>
              </div>
            )}

            <div className="gallery-modal-mobile-bar mobile-only">
              <button
                type="button"
                className="mobile-nav-btn"
                onClick={showPrev}
                aria-label="Previous image"
              >
                <ChevronLeft size={20} /> PREV
              </button>
              <span className="mobile-nav-count">
                {viewingIndex + 1} of {displayPhotos.length}
              </span>
              <button
                type="button"
                className="mobile-nav-btn"
                onClick={showNext}
                aria-label="Next image"
              >
                NEXT <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Chat email={c.email} />
    </>
  );
}
