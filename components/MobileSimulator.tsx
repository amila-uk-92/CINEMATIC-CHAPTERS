"use client";

import { useState } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
  Wifi,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

type DevicePreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: "phone" | "tablet";
};

const PRESETS: DevicePreset[] = [
  { id: "iphone-16", name: "iPhone 16 / 15 Pro", width: 393, height: 852, icon: "phone" },
  { id: "iphone-se", name: "iPhone SE (Compact)", width: 375, height: 667, icon: "phone" },
  { id: "pixel", name: "Pixel / Galaxy", width: 412, height: 915, icon: "phone" },
  { id: "ipad-mini", name: "iPad Mini (Tablet)", width: 768, height: 1024, icon: "tablet" },
];

export default function MobileSimulator({ defaultDraft = false }: { defaultDraft?: boolean }) {
  const [preset, setPreset] = useState<DevicePreset>(PRESETS[0]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [scale, setScale] = useState<number>(0.85);
  const [isDraft, setIsDraft] = useState<boolean>(defaultDraft);
  const [subpath, setSubpath] = useState<string>("/");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [showNetworkInfo, setShowNetworkInfo] = useState<boolean>(false);

  const activeWidth = orientation === "portrait" ? preset.width : preset.height;
  const activeHeight = orientation === "portrait" ? preset.height : preset.width;

  const currentUrl = isDraft
    ? subpath === "/"
      ? "/preview"
      : `/preview?path=${encodeURIComponent(subpath)}`
    : subpath;

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const toggleOrientation = () => {
    setOrientation((prev) => (prev === "portrait" ? "landscape" : "portrait"));
  };

  return (
    <div className="simulator-root">
      {/* Top Simulator Control Bar */}
      <header className="simulator-bar">
        <div className="simulator-bar-left">
          <a href="/" className="simulator-back" title="Back to home">
            <ArrowLeft size={16} />
            <span>EXIT</span>
          </a>
          <div className="simulator-brand">
            <Smartphone size={17} className="gold-icon" />
            <strong>MOBILE STUDIO SIMULATOR</strong>
          </div>
        </div>

        {/* Device presets */}
        <div className="simulator-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset-btn ${preset.id === p.id ? "active" : ""}`}
              onClick={() => setPreset(p)}
              type="button"
            >
              {p.icon === "phone" ? <Smartphone size={13} /> : <Tablet size={13} />}
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Controls: Rotate, Zoom, Source, Wi-Fi */}
        <div className="simulator-controls">
          <button
            type="button"
            className="sim-action-btn"
            onClick={toggleOrientation}
            title={`Rotate to ${orientation === "portrait" ? "Landscape" : "Portrait"}`}
          >
            <RotateCcw size={14} />
            <span>{orientation === "portrait" ? "PORTRAIT" : "LANDSCAPE"}</span>
          </button>

          {/* Scale selector */}
          <div className="sim-scale-group">
            <span className="scale-label">ZOOM</span>
            {[0.75, 0.85, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                className={`scale-btn ${scale === s ? "active" : ""}`}
                onClick={() => setScale(s)}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>

          {/* Target Mode: Live vs Draft */}
          <div className="sim-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${!isDraft ? "active" : ""}`}
              onClick={() => setIsDraft(false)}
            >
              LIVE
            </button>
            <button
              type="button"
              className={`mode-btn ${isDraft ? "active" : ""}`}
              onClick={() => setIsDraft(true)}
            >
              DRAFT
            </button>
          </div>

          {/* Network IP Guide */}
          <button
            type="button"
            className={`sim-action-btn ${showNetworkInfo ? "active" : ""}`}
            onClick={() => setShowNetworkInfo(!showNetworkInfo)}
            title="How to test on a physical smartphone"
          >
            <Wifi size={14} />
            <span>PHONE WI-FI</span>
          </button>

          <button
            type="button"
            className="sim-action-btn icon-only"
            onClick={handleRefresh}
            title="Reload frame"
          >
            <RotateCcw size={13} />
          </button>

          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="sim-action-btn icon-only"
            title="Open in normal browser tab"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Network Test Info Banner (Collapsible) */}
      {showNetworkInfo && (
        <div className="simulator-network-banner">
          <div className="network-info-content">
            <Wifi size={20} className="gold-icon" />
            <div>
              <strong>Test directly on your physical smartphone:</strong>
              <p>
                Connect your phone to the same Wi-Fi and open{" "}
                <code className="ip-badge">http://192.168.8.143:3000</code> in Mobile Safari or Chrome.
              </p>
            </div>
            <button
              type="button"
              className="close-banner-btn"
              onClick={() => setShowNetworkInfo(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area with Phone Mockup */}
      <main className="simulator-stage">
        <div
          className="phone-mockup-wrapper"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {/* Phone Shell */}
          <div
            className={`phone-shell ${preset.icon === "tablet" ? "is-tablet" : ""}`}
            style={{
              width: `${activeWidth}px`,
              height: `${activeHeight}px`,
            }}
          >
            {/* Phone Bezel Top: Speaker & Dynamic Island */}
            {orientation === "portrait" && preset.icon === "phone" && (
              <div className="phone-island">
                <div className="island-camera" />
                <div className="island-sensor" />
              </div>
            )}

            {/* Screen Viewport with Iframe */}
            <iframe
              key={iframeKey}
              src={currentUrl}
              title={`Mobile viewport - ${preset.name}`}
              className="phone-screen-iframe"
            />

            {/* Bottom Home Indicator Bar */}
            {orientation === "portrait" && (
              <div className="phone-home-indicator">
                <span />
              </div>
            )}
          </div>

          {/* Device Dimension Label */}
          <div className="device-spec-label">
            {preset.name} · {activeWidth} × {activeHeight}px · {Math.round(scale * 100)}% scale
          </div>
        </div>
      </main>
    </div>
  );
}
