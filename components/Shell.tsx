"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { Aperture, ArrowUpRight } from "lucide-react";
export default function Shell({
  children,
  title = "STUDIO",
  logout,
}: {
  children: React.ReactNode;
  title?: string;
  logout?: () => void;
}) {
  const [brand, setBrand] = useState({
    name: "Cinematic Chapters",
    logo: "CC",
  });
  useEffect(() => {
    let live = true;
    api("content")
      .then((c) => {
        if (live) setBrand({ name: c.brand, logo: c.logo });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      <header className="workspace-header">
        <a className="brand" href="/">
          <span className="brand-mark">
            {brand.logo || <Aperture size={23} />}
          </span>
          <span>
            {brand.name.toUpperCase()}
            <small>{title}</small>
          </span>
        </a>
        <div>
          <a className="button small" href="/">
            Portfolio <ArrowUpRight size={13} />
          </a>
          {logout && (
            <button className="button small" onClick={logout}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
