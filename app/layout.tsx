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
        <a className="skip-link" href="#page-content">Skip to page content</a>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p>Live estimates only. Bazaar prices can move before a trade completes.</p>
            <p>Thanks to SkyShards for providing the fusion data.</p>
            <a href="https://api.hypixel.net/" target="_blank" rel="noreferrer">Data from the Hypixel API <svg className="external-link-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M11 4h5v5M16 4l-7 7" /><path d="M14 11v4H5V6h4" /></svg></a>
          </div>
        </footer>
      </body>
    </html>
  );
}
