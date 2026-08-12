export type FusionIngredient = {
  id: string;
  amount: number;
};

export type FusionRecipe = {
  id: string;
  inputs: FusionIngredient[];
  output: FusionIngredient;
  inputPlans?: FusionAcquisitionPlan[];
};

export type FusionAcquisitionPlan = {
  id: string;
  amount: number;
  totalCost: number;
  method: "buy" | "fuse";
  crafts?: number;
  producedAmount?: number;
  recipe?: FusionRecipe;
  inputs?: FusionAcquisitionPlan[];
};

export type CalculatedIngredient = FusionIngredient & {
  name: string;
  unitPrice: number;
  totalPrice: number;
  buyVolume?: number;
  sellVolume?: number;
  imageUrl?: string;
};

export type CalculatedPathIngredient = CalculatedIngredient & {
  source: "buy" | "fuse";
};

export type FusionPathStep = {
  stepNumber: number;
  inputs: CalculatedPathIngredient[];
  output: CalculatedIngredient;
  materialCost: number;
};

export type FusionOutputValues = {
  instantSell: number;
  sellOffer: number;
};

export type FusionResult = {
  fusionId: string;
  inputs: CalculatedIngredient[];
  steps: FusionPathStep[];
  acquisitionPlan: FusionAcquisitionPlan[];
  output: CalculatedIngredient;
  inputCost: number;
  outputValue: number;
  outputValues: FusionOutputValues;
  profit: number;
  margin: number;
};

export type FusionScanStats = {
  uniqueCandidates: number;
  pricedCandidates: number;
  unavailableCandidates: number;
  selectedPaths: number;
};
