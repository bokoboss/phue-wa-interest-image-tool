import { describe, expect, it } from "vitest";
import { computeOverlayRect, DEFAULT_SETTINGS } from "./overlay";

describe("computeOverlayRect", () => {
  it("scales logo width as a percentage of source image width", () => {
    const rect = computeOverlayRect(
      { width: 4000, height: 3000 },
      { width: 1000, height: 500 },
      { ...DEFAULT_SETTINGS, sizePct: 10, marginPct: 2.5, position: "bottom-right" },
    );

    expect(rect.width).toBeCloseTo(400);
    expect(rect.height).toBeCloseTo(200);
  });

  it("places a bottom-right logo using margin derived from source width", () => {
    const rect = computeOverlayRect(
      { width: 2000, height: 1200 },
      { width: 1000, height: 500 },
      { ...DEFAULT_SETTINGS, sizePct: 10, marginPct: 2.5, position: "bottom-right" },
    );

    expect(rect.x).toBeCloseTo(1750);
    expect(rect.y).toBeCloseTo(1050);
  });

  it("places a top-left logo using the same margin on both axes", () => {
    const rect = computeOverlayRect(
      { width: 1200, height: 1600 },
      { width: 600, height: 300 },
      { ...DEFAULT_SETTINGS, sizePct: 15, marginPct: 3, position: "top-left" },
    );

    expect(rect.x).toBeCloseTo(36);
    expect(rect.y).toBeCloseTo(36);
  });

  it("keeps very tall logos inside the image bounds", () => {
    const rect = computeOverlayRect(
      { width: 1000, height: 500 },
      { width: 100, height: 1000 },
      { ...DEFAULT_SETTINGS, sizePct: 30, marginPct: 2, position: "bottom-right" },
    );

    expect(rect.height).toBeLessThanOrEqual(460);
    expect(rect.y).toBeGreaterThanOrEqual(20);
  });
});
