import type { ReactNode } from "react";

type WindowKind = "explorer" | "calculator" | "monitor";

function WindowGlyph({ kind }: { kind: WindowKind }) {
  if (kind === "calculator") {
    return <span className="window-glyph window-glyph-calculator" aria-hidden="true">123</span>;
  }

  if (kind === "monitor") {
    return <span className="window-glyph window-glyph-monitor" aria-hidden="true"><i /></span>;
  }

  return <span className="window-glyph window-glyph-folder" aria-hidden="true"><i /></span>;
}

export function WindowsChrome({
  title,
  kind,
  status,
  children,
  className = "",
}: {
  title: string;
  kind: WindowKind;
  status: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`windows-window ${className}`.trim()} aria-label={title}>
      <div className="windows-titlebar">
        <div className="windows-titlebar-label">
          <WindowGlyph kind={kind} />
          <strong>{title}</strong>
        </div>
        <div className="windows-caption-buttons" aria-hidden="true">
          <span className="windows-caption-button windows-minimize">_</span>
          <span className="windows-caption-button windows-maximize">□</span>
          <span className="windows-caption-button windows-close">×</span>
        </div>
      </div>
      <div className="windows-menubar" aria-hidden="true">
        <span><u>F</u>ile</span>
        <span><u>E</u>dit</span>
        <span><u>V</u>iew</span>
        <span><u>T</u>ools</span>
        <span><u>H</u>elp</span>
      </div>
      <div className="windows-client">{children}</div>
      <div className="windows-statusbar">{status}</div>
    </section>
  );
}
