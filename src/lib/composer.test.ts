import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPOSER_SETTINGS,
  THEME_PRESETS,
  applyLayoutPreset,
  computeTextBox,
} from "./composer";

describe("layout presets", () => {
  it("uses a bottom fade, bottom-left copy and bottom-right logo for editorial bottom", () => {
    const next = applyLayoutPreset(DEFAULT_COMPOSER_SETTINGS, "editorial-bottom");

    expect(next.layoutPreset).toBe("editorial-bottom");
    expect(next.overlay.style).toBe("bottom-fade");
    expect(next.text.position).toBe("bottom-left");
    expect(next.text.align).toBe("left");
    expect(next.logo.position).toBe("bottom-right");
  });

  it("uses a top fade and top-left copy for editorial top", () => {
    const next = applyLayoutPreset(DEFAULT_COMPOSER_SETTINGS, "editorial-top");

    expect(next.overlay.style).toBe("top-fade");
    expect(next.text.position).toBe("top-left");
    expect(next.text.align).toBe("left");
  });

  it("uses a full tint and centered copy for center focus", () => {
    const next = applyLayoutPreset(DEFAULT_COMPOSER_SETTINGS, "center-focus");

    expect(next.overlay.style).toBe("full-tint");
    expect(next.text.position).toBe("center");
    expect(next.text.align).toBe("center");
  });
});

describe("earth-tone themes", () => {
  it("ships a cream-on-olive default theme", () => {
    expect(THEME_PRESETS["earth-cream"]).toEqual({
      label: "Earth Cream",
      headlineColor: "#F4EBDD",
      subtextColor: "#D8C7AF",
      accentColor: "#B66A4D",
      overlayColor: "#242720",
    });
  });

  it("ships sage and clay alternatives without leaving the earth-tone palette", () => {
    expect(THEME_PRESETS["sage-clay"].accentColor).toBe("#97A07C");
    expect(THEME_PRESETS["warm-clay"].accentColor).toBe("#C47756");
  });
});

describe("computeTextBox", () => {
  it("derives padding and width from source image width", () => {
    const box = computeTextBox(
      { width: 1000, height: 800 },
      { ...DEFAULT_COMPOSER_SETTINGS.text, position: "top-left", paddingPct: 5, widthPct: 65 },
    );

    expect(box.x).toBeCloseTo(50);
    expect(box.y).toBeCloseTo(50);
    expect(box.maxWidth).toBeCloseTo(650);
    expect(box.verticalDirection).toBe("down");
  });

  it("anchors bottom-left copy above the lower safe margin", () => {
    const box = computeTextBox(
      { width: 1000, height: 800 },
      { ...DEFAULT_COMPOSER_SETTINGS.text, position: "bottom-left", paddingPct: 5 },
    );

    expect(box.x).toBeCloseTo(50);
    expect(box.y).toBeCloseTo(750);
    expect(box.verticalDirection).toBe("up");
  });

  it("centers the copy block on the image", () => {
    const box = computeTextBox(
      { width: 1200, height: 800 },
      { ...DEFAULT_COMPOSER_SETTINGS.text, position: "center", widthPct: 70 },
    );

    expect(box.x).toBeCloseTo(600);
    expect(box.y).toBeCloseTo(400);
    expect(box.maxWidth).toBeCloseTo(840);
    expect(box.align).toBe("center");
  });
});
