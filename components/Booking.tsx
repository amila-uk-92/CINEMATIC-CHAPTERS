"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Aperture,
} from "lucide-react";
import type { Content } from "@/lib/content";
import { api, money } from "./api";
import Shell from "./Shell";
export default function Booking({ content: c }: { content: Content }) {
  const packages = c.packages.filter(
    (p) => p.visible && p.accepting && !p.archived,
  );
  const [packageId, setPackageId] = useState(packages[0]?.id || ""),
    [month, setMonth] = useState(
      DateTime.now().setZone("Europe/London").startOf("month"),
    ),
    [date, setDate] = useState(""),
    [days, setDays] = useState<Record<string, string>>({}),
    [slots, setSlots] = useState<any[]>([]),
    [start, setStart] = useState(""),
    [step, setStep] = useState(0),
    [details, setDetails] = useState({
      name: "",
      email: "",
      phone: "",
      message: "",
    }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [retryKey, setRetryKey] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("package");
    if (packages.some((p) => p.id === id)) setPackageId(id!);
    setRetryKey(crypto.randomUUID());
  }, []);
  useEffect(() => {
    if (!packageId) return;
    let live = true;
    setLoading(true);
    setError("");
    api(`availability?package=${packageId}&date=${month.toISODate()}&month=1`)
      .then((d) => {
        if (live)
          setDays(
            Object.fromEntries(d.days.map((d: any) => [d.date, d.status])),
          );
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [packageId, month.toISODate()]);
  useEffect(() => {
    setStart("");
    setSlots([]);
    if (!date || !packageId) return;
    let live = true;
    api(`availability?package=${packageId}&date=${date}`)
      .then((d) => {
        if (live) setSlots(d.slots);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [date, packageId]);
  const p = packages.find((p) => p.id === packageId);
  if (!c.packagesVisible || !packages.length)
    return (
      <Shell title="SESSION ENQUIRY">
        <div className="workspace">
          <h1>LET’S TALK.</h1>
          <p className="muted">
            Online package requests are currently unavailable. Tell us about
            your session.
          </p>
          <a className="button gold" href={`mailto:${c.email}`}>
            EMAIL THE STUDIO
            <ArrowUpRight size={16} />
          </a>
        </div>
      </Shell>
    );
  return (
    <Shell title="REQUEST YOUR CHAPTER">
      <div className="workspace">
        <p className="eyebrow">A MOMENT WORTH MAKING TIME FOR</p>
        <h1>REQUEST YOUR CHAPTER.</h1>
        <p className="muted">
          One shared calendar. Two photographers. Times shown in Europe/London.
        </p>
        {c.demo && (
          <p className="demo-label">
            DEVELOPMENT AVAILABILITY & DEMO PRICES · NOT A LIVE BUSINESS
            CALENDAR
          </p>
        )}
        {result ? (
          <div className="panel glass">
            <Check color="var(--gold)" size={30} />
            <h2 style={{ marginTop: 20 }}>YOUR REQUEST IS RECEIVED.</h2>
            <p className="muted" style={{ marginTop: 20 }}>
              Your request is pending approval. It is not confirmed. The studio
              will review your details and send an update.
            </p>
            <p className="badge" style={{ marginTop: 20 }}>
              PENDING APPROVAL
            </p>
            <p className="muted" style={{ marginTop: 20 }}>
              Reference: {result.id}
            </p>
            <a className="button" href="/" style={{ marginTop: 25 }}>
              BACK TO THE PORTFOLIO
            </a>
          </div>
        ) : (
          <>
            <div className="steps">
              {[
                "01 · DURATION & TIME",
                "02 · YOUR DETAILS",
                "03 · REVIEW REQUEST",
              ].map((s, n) => (
                <span key={s} className={step === n ? "active" : ""}>
                  {s}
                </span>
              ))}
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="booking-layout">
              <div className="panel glass">
                {step === 0 ? (
                  <>
                    <h2>MAKE TIME FOR YOUR STORY.</h2>
                    <label htmlFor="package">Session duration</label>
                    <select
                      id="package"
                      value={packageId}
                      onChange={(e) => {
                        setPackageId(e.target.value);
                        setDate("");
                        setStart("");
                        setRetryKey(crypto.randomUUID());
                      }}
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {money(p.price)} · {p.duration / 60} hours
                        </option>
                      ))}
                    </select>
                    <div className="calendar-header">
                      <button
                        className="icon"
                        aria-label="Previous month"
                        onClick={() => setMonth(month.minus({ months: 1 }))}
                      >
                        <ArrowLeft size={19} />
                      </button>
                      <h3>{month.toFormat("LLLL yyyy")}</h3>
                      <button
                        className="icon"
                        aria-label="Next month"
                        onClick={() => setMonth(month.plus({ months: 1 }))}
                      >
                        <ArrowRight size={19} />
                      </button>
                    </div>
                    {loading && (
                      <p role="status" className="muted">
                        Checking the calendar…
                      </p>
                    )}
                    <div
                      className="calendar"
                      aria-label="Choose a session date"
                    >
                      {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                        (d) => (
                          <span className="weekday" key={d}>
                            {d}
                          </span>
                        ),
                      )}
                      {Array.from({ length: month.weekday - 1 }, (_, n) => (
                        <span key={"blank" + n} />
                      ))}
                      {Array.from({ length: month.daysInMonth! }, (_, n) => {
                        const d = month.plus({ days: n }).toISODate()!,
                          status = days[d],
                          disabled =
                            !status ||
                            ["blocked", "fully-booked"].includes(status);
                        return (
                          <button
                            key={d}
                            aria-label={`${d}, ${status || "checking"}`}
                            aria-pressed={date === d}
                            className={`${status || ""} ${date === d ? "selected" : ""}`}
                            disabled={disabled || loading}
                            onClick={() => {
                              setDate(d);
                              setRetryKey(crypto.randomUUID());
                            }}
                          >
                            {n + 1}
                            <span className="day-status">
                              {status === "available"
                                ? "OPEN"
                                : status === "partially-available"
                                  ? "PARTIAL"
                                  : status === "blocked"
                                    ? "BLOCKED"
                                    : "FULL"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="calendar-legend">
                      <span>OPEN · Available</span>
                      <span>PARTIAL · Limited slots</span>
                      <span>FULL · No slots</span>
                      <span>BLOCKED · Closed</span>
                    </div>
                    {date && (
                      <>
                        <h3 style={{ marginTop: 25 }}>
                          {DateTime.fromISO(date).toFormat("ccc, d LLL")} · FREE
                          TIMES
                        </h3>
                        <div className="slots">
                          {slots.map((s) => (
                            <button
                              key={s.start}
                              className={start === s.start ? "selected" : ""}
                              aria-pressed={start === s.start}
                              onClick={() => {
                                setStart(s.start);
                                setRetryKey(crypto.randomUUID());
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {!slots.length && (
                          <p className="muted">
                            No free times for this duration. Choose another
                            date.
                          </p>
                        )}
                      </>
                    )}
                    <div className="form-actions">
                      <button
                        className="button gold"
                        disabled={!start}
                        onClick={() => {
                          setError("");
                          setStep(1);
                        }}
                      >
                        CONTINUE
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </>
                ) : step === 1 ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setError("");
                      setStep(2);
                    }}
                  >
                    <h2>A LITTLE ABOUT YOU.</h2>
                    {(["name", "email", "phone", "message"] as const).map(
                      (field) => (
                        <div key={field}>
                          <label htmlFor={field}>
                            {
                              {
                                name: "Your name",
                                email: "Email address",
                                phone: "Phone number",
                                message:
                                  "Tell us about your session (optional)",
                              }[field]
                            }
                          </label>
                          {field === "message" ? (
                            <textarea
                              id={field}
                              value={details[field]}
                              maxLength={2000}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  [field]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              id={field}
                              type={
                                field === "email"
                                  ? "email"
                                  : field === "phone"
                                    ? "tel"
                                    : "text"
                              }
                              autoComplete={
                                field === "name"
                                  ? "name"
                                  : field === "phone"
                                    ? "tel"
                                    : "email"
                              }
                              required
                              minLength={
                                field === "name"
                                  ? 2
                                  : field === "phone"
                                    ? 5
                                    : undefined
                              }
                              maxLength={
                                field === "name"
                                  ? 100
                                  : field === "phone"
                                    ? 40
                                    : 254
                              }
                              value={details[field]}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  [field]: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                      ),
                    )}
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button"
                        onClick={() => setStep(0)}
                      >
                        BACK
                      </button>
                      <button className="button gold">
                        REVIEW REQUEST
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2>CHECK YOUR CHAPTER.</h2>
                    <div className="record">
                      <p>
                        {details.name}\n{details.email}\n{details.phone}\n\n
                        {details.message}
                      </p>
                    </div>
                    <p className="muted">
                      Submitting reserves this time while the studio reviews
                      your request. Only a confirmation email confirms your
                      booking.
                    </p>
                    <p className="muted" style={{ marginTop: 15 }}>
                      Read the{" "}
                      <a
                        href="/policies/privacy"
                        style={{ textDecoration: "underline" }}
                      >
                        draft privacy information
                      </a>
                      . No payment is taken.
                    </p>
                    <div className="form-actions">
                      <button className="button" onClick={() => setStep(1)}>
                        BACK
                      </button>
                      <button
                        className="button gold"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            setResult(
                              await api("booking", {
                                packageId,
                                start,
                                ...details,
                                idempotencyKey: retryKey,
                              }),
                            );
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {busy ? "SUBMITTING…" : "SEND BOOKING REQUEST"}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <aside className="panel glass">
                <Aperture size={27} color="var(--gold)" />
                <p className="eyebrow" style={{ marginTop: 20 }}>
                  YOUR CHOSEN CHAPTER
                </p>
                <h2 style={{ marginTop: 15 }}>{p?.name.toUpperCase()}</h2>
                <div className="price">
                  {money(p?.price || 0)}
                  <small>
                    {(p?.duration || 0) / 60} HOURS
                    {c.demo ? " · DEMO PRICE" : ""}
                  </small>
                </div>
                <div className="package-line" />
                <p className="muted">{p?.description}</p>
                {start && (
                  <p style={{ marginTop: 25 }}>
                    {DateTime.fromISO(start)
                      .setZone("Europe/London")
                      .toFormat("cccc, d LLLL yyyy\nHH:mm ZZZZ")}
                    \nLeicester & surrounding area
                  </p>
                )}
                <p className="muted" style={{ marginTop: 25 }}>
                  Request → Confirmation → Session → Gallery delivery
                </p>
                <span className="badge" style={{ marginTop: 25 }}>
                  APPROVAL REQUIRED
                </span>
              </aside>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
