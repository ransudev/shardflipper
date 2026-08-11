import { InventoryCalculator } from "@/components/InventoryCalculator";
import { Topbar } from "@/components/Topbar";
import { getFusionData } from "@/lib/fusionData";

export default async function FusionCalculatorPage() {
  const { results, shards } = await getFusionData();

  return (
    <div className="app-content calculator-page" id="page-content">
      <Topbar current="calculator" />
      <section className="calculator-hero" aria-labelledby="calculator-title">
        <div className="calculator-page-inner">
          <p className="section-index">Tools / Inventory</p>
          <h1 id="calculator-title">Use what you own. Fuse for what pays.</h1>
          <p className="calculator-page-intro">Enter the shards already in your storage and the calculator will rank profitable fusion paths by the cash you still need to spend.</p>
        </div>
      </section>
      <InventoryCalculator results={results} shards={shards} />
    </div>
  );
}
