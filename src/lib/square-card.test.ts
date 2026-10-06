import { describe, expect, it } from "vitest";
import {
  computeImagePlacement,
  computeSquareRegions,
  readableTextPalette,
} from "./square-card";

describe("square-card regions", () => {
  it("locks the default split to a 68/32 image/text composition", () => {
    const regions = computeSquareRegions(1080, 68);

    expect(regions.image).toEqual({ x: 0, y: 0, width: 1080, height: 734.4 });
    expect(regions.text).toEqual({ x: 0, y: 734.4, width: 1080, height: 345.6 });
  });

  it("clamps unsafe ratios so both regions remain usable", () => {
    expect(computeSquareRegions(1080, 10).image.height).toBe(594);
    expect(computeSquareRegions(1080, 95).image.height).toBe(864);
  });
});

describe("square-card image placement", () => {
  const area = { x: 0, y: 0, width: 1080, height: 734.4 };

  it("contains a landscape image without cropping", () => {
    const rect = computeImagePlacement({ width: 1600, height: 900 }, area, "contain");

    expect(rect.width).toBeCloseTo(1080);
    expect(rect.height).toBeCloseTo(607.5);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(63.45);
  });

  it("contains a portrait image and centers the side padding", () => {
    const rect = computeImagePlacement({ width: 900, height: 1600 }, area, "contain");

    expect(rect.height).toBeCloseTo(734.4);
    expect(rect.width).toBeCloseTo(413.1);
    expect(rect.x).toBeCloseTo(333.45);
    expect(rect.y).toBeCloseTo(0);
  });

  it("covers the image region when cropping is requested", () => {
    const rect = computeImagePlacement({ width: 1600, height: 900 }, area, "cover");

    expect(rect.height).toBeCloseTo(734.4);
    expect(rect.width).toBeCloseTo(1305.6);
    expect(rect.x).toBeCloseTo(-112.8);
  });
});

describe("square-card readable text", () => {
  it("uses dark earth-tone copy on a light panel", () => {
    expect(readableTextPalette("#F2E7D5")).toEqual({
      headline: "#2F332B",
      subtext: "#5F6157",
    });
  });

  it("uses warm light copy on a dark panel", () => {
    expect(readableTextPalette("#30362D")).toEqual({
      headline: "#F4EBDD",
      subtext: "#D8C7AF",
    });
  });
});
