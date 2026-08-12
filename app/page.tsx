import { FusionTable } from "@/components/FusionTable";
import { getFusionData } from "@/lib/fusionData";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const { results, lastUpdated, scanStats } = await getFusionData();

  return (
    <FusionTable
      results={results}
      lastUpdated={lastUpdated}
      scanStats={scanStats}
    />
  );
}
