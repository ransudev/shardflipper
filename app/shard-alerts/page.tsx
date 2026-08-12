import { ShardAlerts } from "@/components/ShardAlerts";
import { Topbar } from "@/components/Topbar";
import { getStoredShardAlertsData } from "@/lib/shardAlerts";

export default async function ShardAlertsPage() {
  const snapshot = await getStoredShardAlertsData();

  return (
    <div className="app-content alerts-page" id="page-content">
      <Topbar current="alerts" />
      <section className="alerts-hero" aria-labelledby="alerts-title">
        <div className="alerts-page-inner">
          <p className="section-index">Market / Direct shards</p>
          <h1 id="alerts-title">Catch real price spikes.</h1>
          <p className="alerts-page-intro">Compare current instant-sell prices with Hypixel’s average Bazaar data and surface direct shards trading meaningfully above normal.</p>
        </div>
      </section>
      <ShardAlerts snapshot={snapshot} />
    </div>
  );
}
