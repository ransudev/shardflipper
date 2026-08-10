export default function Loading() {
  return (
    <div className="loading-page" aria-live="polite">
      <svg className="loading-crystal" aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 8 10-8 10-8-10 8-10Z" /><path d="m8.5 12 3.5 3.5 3.5-3.5" /></svg>
      <h1>Reading the Bazaar</h1>
      <p>Matching current shard prices to fusion recipes…</p>
      <div className="loading-bar"><span /></div>
    </div>
  );
}
