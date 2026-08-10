export type FusionIngredient = {
  id: string;
  amount: number;
};

export type FusionRecipe = {
  id: string;
  inputs: FusionIngredient[];
  output: FusionIngredient;
};

export type CalculatedIngredient = FusionIngredient & {
  name: string;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
};

export type FusionResult = {
  fusionId: string;
  inputs: CalculatedIngredient[];
  output: CalculatedIngredient;
  inputCost: number;
  outputValue: number;
  profit: number;
  margin: number;
};

export type FusionScanStats = {
  uniqueCandidates: number;
  pricedCandidates: number;
  unavailableCandidates: number;
  selectedPaths: number;
};
