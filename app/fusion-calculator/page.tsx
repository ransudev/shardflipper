import { InventoryCalculator } from "@/components/InventoryCalculator";
import { Topbar } from "@/components/Topbar";
import { getFusionData } from "@/lib/fusionData";
import { connection } from "next/server";

export default async function FusionCalculatorPage() {
  await connection();
  const { results, shards } = await getFusionData();

  return (
    <div className="app-content calculator-page" id="page-content">
      <Topbar current="calculator" />
      <InventoryCalculator results={results} shards={shards} />
    </div>
  );
}
