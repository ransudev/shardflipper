import { ShardAlerts } from "@/components/ShardAlerts";
import { Topbar } from "@/components/Topbar";
import { getShardAlertsData } from "@/lib/shardAlerts";

export default async function ShardAlertsPage() {
  const { alerts, directCount, lastUpdated } = await getShardAlertsData();

  return (
    <div className="app-content alerts-page" id="page-content">
      <Topbar current="alerts" />
      <section className="alerts-hero" aria-labelledby="alerts-title">
        <div className="alerts-page-inner">
          <p className="section-index">Market / Direct shards</p>
          <h1 id="alerts-title">Catch the shards moving up.</h1>
          <p className="alerts-page-intro">Track directly obtainable shards against your last snapshot and surface the price moves worth watching.</p>
        </div>
      </section>
      <ShardAlerts alerts={alerts} directCount={directCount} lastUpdated={lastUpdated} />
    </div>
  );
}
