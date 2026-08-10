import { describe, expect, it } from "vitest";
import { formatCoins, formatMargin, formatSignedCoins } from "@/lib/formatCoins";

describe("coin formatting", () => {
  it("formats compact coin values", () => {
    expect(formatCoins(950)).toBe("950");
    expect(formatCoins(1_200)).toBe("1.2K");
    expect(formatCoins(450_000)).toBe("450K");
    expect(formatCoins(1_250_000)).toBe("1.25M");
    expect(formatCoins(2_400_000_000)).toBe("2.4B");
  });

  it("formats signed profit and margin", () => {
    expect(formatSignedCoins(44_000)).toBe("+44K");
    expect(formatSignedCoins(-30_000)).toBe("−30K");
    expect(formatMargin(19.44)).toBe("+19.4%");
  });
});
