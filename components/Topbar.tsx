import Link from "next/link";

type TopbarPage = "paths" | "calculator" | "alerts";

export function Topbar({ current }: { current: TopbarPage }) {
  return (
    <header className="site-topbar">
      <div className="site-topbar-inner">
        <Link className="site-topbar-brand" href="/" aria-label="Shard Fusion Finder home">
          <span className="site-topbar-mark" aria-hidden="true">SF</span>
          <span>
            <strong>Shard Fusion</strong>
            <small>Live market tools</small>
          </span>
        </Link>

        <nav className="site-topbar-nav" aria-label="Primary navigation">
          <Link href="/" aria-current={current === "paths" ? "page" : undefined}>Shard paths</Link>
          <Link href="/fusion-calculator" aria-current={current === "calculator" ? "page" : undefined}>Fusion calculator</Link>
          <Link href="/shard-alerts" aria-current={current === "alerts" ? "page" : undefined}>Shard alerts</Link>
        </nav>
      </div>
    </header>
  );
}
