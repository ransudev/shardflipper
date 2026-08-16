"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TopbarPage = "paths" | "calculator" | "alerts";

const destinations: Array<{ key: TopbarPage; href: string; label: string; shortLabel: string }> = [
  { key: "paths", href: "/", label: "Shard Paths", shortLabel: "Paths" },
  { key: "calculator", href: "/fusion-calculator", label: "Fusion Calculator", shortLabel: "Calculator" },
  { key: "alerts", href: "/shard-alerts", label: "Shard Alerts", shortLabel: "Alerts" },
];

function DesktopIcon({ kind }: { kind: TopbarPage }) {
  return (
    <span className={`desktop-icon desktop-icon-${kind}`} aria-hidden="true">
      <span />
    </span>
  );
}

export function Topbar({ current }: { current: TopbarPage }) {
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState("--:--");
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(Date.now()));
    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!startOpen) return;
    const close = (event: MouseEvent) => {
      if (!startRef.current?.contains(event.target as Node)) setStartOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStartOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [startOpen]);

  return (
    <>
      <nav className="desktop-shortcuts" aria-label="Desktop shortcuts">
        {destinations.map((destination) => (
          <Link
            key={destination.key}
            className={current === destination.key ? "desktop-shortcut active" : "desktop-shortcut"}
            href={destination.href}
            aria-current={current === destination.key ? "page" : undefined}
          >
            <DesktopIcon kind={destination.key} />
            <span>{destination.label}</span>
          </Link>
        ))}
      </nav>

      <header className="site-topbar">
        <div className="site-topbar-inner">
          <div className="start-area" ref={startRef}>
            {startOpen && (
              <nav className="start-menu" id="start-menu" aria-label="Start menu">
                <div className="start-menu-rail" aria-hidden="true"><strong>Shard Fusion</strong><span>Finder</span></div>
                <div className="start-menu-content">
                  <div className="start-menu-user"><span className="site-topbar-mark" aria-hidden="true">SF</span><strong>Live Market Tools</strong></div>
                  {destinations.map((destination) => (
                    <Link key={destination.key} href={destination.href} onClick={() => setStartOpen(false)}>
                      <DesktopIcon kind={destination.key} />
                      <span><strong>{destination.label}</strong><small>Open {destination.shortLabel.toLowerCase()}</small></span>
                    </Link>
                  ))}
                  <div className="start-menu-footer"><span aria-hidden="true">●</span> Live Bazaar connection</div>
                </div>
              </nav>
            )}
            <button className="start-button" type="button" aria-expanded={startOpen} aria-controls="start-menu" onClick={() => setStartOpen((open) => !open)}>
              <span className="start-flag" aria-hidden="true"><i /><i /><i /><i /></span>
              <strong>start</strong>
            </button>
          </div>

          <nav className="site-topbar-nav" aria-label="Open applications">
            {destinations.map((destination) => (
              <Link key={destination.key} href={destination.href} aria-current={current === destination.key ? "page" : undefined}>
                <DesktopIcon kind={destination.key} />
                <span>{destination.shortLabel}</span>
              </Link>
            ))}
          </nav>

          <div className="system-tray" aria-label={`Bazaar connected. Current time ${clock}`}>
            <span className="tray-network" aria-hidden="true"><i /><i /></span>
            <span className="tray-live"><i aria-hidden="true" />Live</span>
            <time>{clock}</time>
          </div>
        </div>
      </header>
    </>
  );
}
