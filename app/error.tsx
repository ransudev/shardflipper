"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="error-page">
      <div className="system-dialog error-window">
        <div className="windows-titlebar"><strong>Market Data Error</strong><span className="windows-caption-button" aria-hidden="true">×</span></div>
        <div className="system-dialog-body">
          <span className="error-system-icon" aria-hidden="true">!</span>
          <div><h1>We couldn’t reach the Bazaar.</h1><p>Hypixel may be temporarily unavailable. Try the request again shortly.</p></div>
        </div>
        <div className="system-dialog-actions"><button type="button" onClick={retry}>Try again</button></div>
      </div>
    </div>
  );
}
