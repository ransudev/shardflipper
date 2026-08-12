import { getFreshShardAlertsData, saveShardAlertsSnapshot } from "@/lib/shardAlerts";

export const maxDuration = 30;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getFreshShardAlertsData();
    await saveShardAlertsSnapshot(snapshot);

    return Response.json({
      ok: true,
      capturedAt: snapshot.capturedAt,
      directCount: snapshot.directCount,
      lastUpdated: snapshot.lastUpdated,
    });
  } catch (error) {
    console.error("Shard alert background scan failed", error);
    return Response.json({ ok: false, error: "Shard alert scan failed" }, { status: 502 });
  }
}
