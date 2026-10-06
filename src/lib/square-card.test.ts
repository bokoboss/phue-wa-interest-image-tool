import { describe, expect, it } from "vitest";
import {
  computeImagePlacement,
  computeSquareLogoRect,
  computeSquareRegions,
  readableTextPalette,
  SQUARE_MIN_SUBTEXT_SIZE_PCT,
} from "./square-card";

describe("square-card regions", () => {
  it("locks the default split to a 68/32 image/text composition", () => {
    const regions = computeSquareRegions(1080, 68);

    expect(regions.image.x).toBe(0);
    expect(regions.image.y).toBe(0);
    expect(regions.image.width).toBe(1080);
    expect(regions.image.height).toBeCloseTo(734.4);
    expect(regions.text.x).toBe(0);
    expect(regions.text.y).toBeCloseTo(734.4);
    expect(regions.text.width).toBe(1080);
    expect(regions.text.height).toBeCloseTo(345.6);
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

  it("moves horizontal cover crop left, center, or right", () => {
    const left = computeImagePlacement({ width: 1600, height: 900 }, area, "cover", "left", "center");
    const center = computeImagePlacement({ width: 1600, height: 900 }, area, "cover", "center", "center");
    const right = computeImagePlacement({ width: 1600, height: 900 }, area, "cover", "right", "center");

    expect(left.x).toBeCloseTo(0);
    expect(center.x).toBeCloseTo(-112.8);
    expect(right.x).toBeCloseTo(-225.6);
  });

  it("moves vertical cover crop top, center, or bottom", () => {
    const portrait = { width: 900, height: 1600 };
    const top = computeImagePlacement(portrait, area, "cover", "center", "top");
    const center = computeImagePlacement(portrait, area, "cover", "center", "center");
    const bottom = computeImagePlacement(portrait, area, "cover", "center", "bottom");

    expect(top.y).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(-592.8);
    expect(bottom.y).toBeCloseTo(-1185.6);
  });
});

describe("square-card logo anchoring", () => {
  it("anchors the logo to the full image region rather than the contained source image", () => {
    const imageArea = { x: 0, y: 0, width: 1080, height: 734.4 };
    const rect = computeSquareLogoRect(
      imageArea,
      { width: 500, height: 500 },
      { position: "top-right", sizePct: 9, marginPct: 2.5, opacity: 92 },
    );

    expect(rect.x).toBeCloseTo(955.8);
    expect(rect.y).toBeCloseTo(27);
    expect(rect.width).toBeCloseTo(97.2);
    expect(rect.height).toBeCloseTo(97.2);
  });
});

describe("square-card readable text", () => {
  it("does not auto-shrink subtext below 1.8 percent of card width", () => {
    expect(SQUARE_MIN_SUBTEXT_SIZE_PCT).toBe(1.8);
  });

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
