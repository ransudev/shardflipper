import { ShardAlerts } from "@/components/ShardAlerts";
import { Topbar } from "@/components/Topbar";
import { getStoredShardAlertsData } from "@/lib/shardAlerts";

export default async function ShardAlertsPage() {
  const snapshot = await getStoredShardAlertsData();

  return (
    <div className="app-content alerts-page" id="page-content">
      <Topbar current="alerts" />
      <ShardAlerts snapshot={snapshot} />
    </div>
  );
}
