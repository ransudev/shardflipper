import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shard Fusion Finder · Live Market Index",
  description: "Compare Hypixel SkyBlock shard fusions using live Bazaar prices.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#shard-list">Skip to shard paths</a>
        <header className="site-header">
          <div className="site-header-inner">
            <a className="site-brand" href="#page-title" aria-label="Shard Fusion Finder home">
              <span className="brand-mark" aria-hidden="true">SF</span>
              <span>
                <strong>Shard Fusion Finder</strong>
                <small>Hypixel SkyBlock</small>
              </span>
            </a>
            <nav className="site-nav" aria-label="Primary navigation">
              <a href="#shard-list">Shard paths</a>
              <a href="https://api.hypixel.net/" target="_blank" rel="noreferrer">Hypixel API <svg className="external-link-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M11 4h5v5M16 4l-7 7" /><path d="M14 11v4H5V6h4" /></svg></a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p>Live estimates only. Bazaar prices can move before a trade completes.</p>
            <a href="https://api.hypixel.net/" target="_blank" rel="noreferrer">Data from the Hypixel API <svg className="external-link-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M11 4h5v5M16 4l-7 7" /><path d="M14 11v4H5V6h4" /></svg></a>
          </div>
        </footer>
      </body>
    </html>
  );
}
