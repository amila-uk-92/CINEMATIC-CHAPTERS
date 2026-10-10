"use client";

import { useEffect, useRef } from "react";
import {
  Aperture,
  LayoutDashboard,
  PanelsTopLeft,
  Images,
  CalendarDays,
  Clock3,
  Users,
  FolderOpen,
  Mail,
  History,
  Search,
  RefreshCw,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import Shell from "./Shell";

const areas = [
  ["Overview", LayoutDashboard],
  ["Website Content", PanelsTopLeft],
  ["Media", Images],
  ["Bookings", CalendarDays],
  ["Availability", Clock3],
  ["Clients", Users],
  ["Galleries", FolderOpen],
  ["Email Inbox", Mail],
  ["Audit", History],
] as const;
const searchable = [
  "Media",
  "Bookings",
  "Clients",
  "Galleries",
  "Email Inbox",
  "Audit",
];

export default function AdminFrame({
  authenticated,
  tab,
  setTab,
  query,
  setQuery,
  counts,
  refresh,
  logout,
  children,
}: {
  authenticated: boolean;
  tab: string;
  setTab: (tab: string) => void;
  query: string;
  setQuery: (value: string) => void;
  counts: Record<string, number>;
  refresh: () => void;
  logout: () => void;
  children: React.ReactNode;
}) {
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k" &&
        searchable.includes(tab)
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [tab]);
  if (!authenticated)
    return <Shell title="STUDIO ADMINISTRATION">{children}</Shell>;
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <Aperture size={25} />
          <span>
            THE STUDIO<small>Photography workspace</small>
          </span>
        </a>
        <p className="admin-nav-label">WORKSPACE</p>
        <div
          className="admin-navigation"
          role="tablist"
          aria-label="Admin areas"
          aria-orientation="vertical"
          onKeyDown={(e) => {
            if (
              ![
                "ArrowDown",
                "ArrowUp",
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
              ].includes(e.key)
            )
              return;
            e.preventDefault();
            const index =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? areas.length - 1
                  : (areas.findIndex(([name]) => name === tab) +
                      (["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : -1) +
                      areas.length) %
                    areas.length;
            setTab(areas[index][0]);
            (
              e.currentTarget.querySelectorAll('[role="tab"]')[
                index
              ] as HTMLElement
            )?.focus();
          }}
        >
          {areas.map(([name, Icon]) => (
            <button
              key={name}
              role="tab"
              aria-label={name}
              aria-selected={tab === name}
              aria-controls="admin-area"
              tabIndex={tab === name ? 0 : -1}
              id={`admin-tab-${areas.findIndex(([n]) => n === name)}`}
              onClick={() => setTab(name)}
              className={tab === name ? "active" : ""}
            >
              <Icon size={16} />
              <span>{name}</span>
              {counts[name] !== undefined && (
                <small aria-hidden="true">{counts[name]}</small>
              )}
            </button>
          ))}
        </div>
        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer">
            <ArrowUpRight size={15} /> View portfolio
          </a>
          <button onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
          <small>Private studio administration</small>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page-title">
            <h1>THE STUDIO.</h1>
            <span aria-hidden="true">/</span>
            <h2>{tab}</h2>
          </div>
          <div className="admin-topbar-actions">
            {searchable.includes(tab) && (
              <label className="admin-search">
                <Search size={15} />
                <input
                  ref={search}
                  type="search"
                  aria-label={`Search ${tab.toLowerCase()}`}
                  placeholder="Search records…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            )}
            <button className="button small admin-refresh" onClick={refresh}>
              <RefreshCw size={14} />
              <span>REFRESH</span>
            </button>
            <button
              className="button small admin-mobile-signout"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>
        <main
          id="admin-area"
          role="tabpanel"
          aria-labelledby={`admin-tab-${areas.findIndex(([n]) => n === tab)}`}
          className="admin-area"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
