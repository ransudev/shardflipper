import { FusionTable } from "@/components/FusionTable";
import { getFusionData } from "@/lib/fusionData";

export default async function Home() {
  const { results, lastUpdated, scanStats } = await getFusionData();

  return (
    <FusionTable
      results={results}
      lastUpdated={lastUpdated}
      scanStats={scanStats}
    />
  );
}
