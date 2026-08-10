"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="error-page">
      <span>!</span>
      <p className="section-index">MARKET DATA UNAVAILABLE</p>
      <h1>We couldn’t reach the Bazaar.</h1>
      <p>Hypixel may be temporarily unavailable. Your data is safe—try the request again shortly.</p>
      <button type="button" onClick={retry}>Try again <svg className="retry-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 4v4h4" /></svg></button>
    </div>
  );
}
