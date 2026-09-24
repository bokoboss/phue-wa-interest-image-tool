import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPOSER_SETTINGS,
  FONT_PRESETS,
  OVERLAY_OPACITY_RANGE,
  THEME_PRESETS,
  applyLayoutPreset,
  computeTextBox,
  migrateV2ComposerSettings,
  resetComposerSection,
} from "./composer";

describe("v0.2.1 defaults", () => {
  it("starts overlay opacity at 90 percent and allows a fully opaque 100 percent", () => {
    expect(DEFAULT_COMPOSER_SETTINGS.overlay.opacity).toBe(90);
    expect(OVERLAY_OPACITY_RANGE).toEqual({ min: 0, max: 100 });
  });

  it("starts with the loopless Kanit font preset", () => {
    expect(DEFAULT_COMPOSER_SETTINGS.text.fontPreset).toBe("kanit");
    expect(FONT_PRESETS.kanit.label).toBe("Kanit");
    expect(FONT_PRESETS.kanit.googleFamily).toBe("Kanit");
  });

  it("offers multiple Thai font presets", () => {
    expect(Object.keys(FONT_PRESETS)).toEqual([
      "kanit",
      "prompt",
      "ibm-plex-sans-thai",
      "sarabun",
    ]);
  });
});

describe("v0.2 storage migration", () => {
  it("upgrades the old 72 percent default to the new 90 percent default", () => {
    const migrated = migrateV2ComposerSettings({
      ...DEFAULT_COMPOSER_SETTINGS,
      overlay: { style: "bottom-fade", opacity: 72 },
      text: { ...DEFAULT_COMPOSER_SETTINGS.text, fontPreset: undefined as never },
    });

    expect(migrated.overlay.opacity).toBe(90);
    expect(migrated.text.fontPreset).toBe("kanit");
  });

  it("preserves a user-customized v0.2 overlay opacity", () => {
    const migrated = migrateV2ComposerSettings({
      ...DEFAULT_COMPOSER_SETTINGS,
      overlay: { style: "bottom-fade", opacity: 58 },
    });

    expect(migrated.overlay.opacity).toBe(58);
  });
});

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

  it("preserves the user's overlay opacity when switching layout", () => {
    const current = {
      ...DEFAULT_COMPOSER_SETTINGS,
      overlay: { ...DEFAULT_COMPOSER_SETTINGS.overlay, opacity: 63 },
    };

    expect(applyLayoutPreset(current, "editorial-top").overlay.opacity).toBe(63);
    expect(applyLayoutPreset(current, "center-focus").overlay.opacity).toBe(63);
  });
});


describe("section resets", () => {
  const customized = {
    ...DEFAULT_COMPOSER_SETTINGS,
    layoutPreset: "editorial-top" as const,
    themePreset: "warm-clay" as const,
    overlay: { style: "full-tint" as const, opacity: 41 },
    text: {
      ...DEFAULT_COMPOSER_SETTINGS.text,
      headline: "หัวเรื่องที่กำลังเขียน",
      subtext: "ข้อความรอง",
      position: "center" as const,
      align: "center" as const,
      widthPct: 82,
      paddingPct: 8,
      headlineSizePct: 7.2,
      subtextSizePct: 3.1,
      fontPreset: "prompt" as const,
    },
    logo: {
      ...DEFAULT_COMPOSER_SETTINGS.logo,
      position: "top-left" as const,
      sizePct: 17,
      marginPct: 5,
      opacity: 55,
    },
  };

  it("resets layout by reapplying the default layout without erasing copy or custom opacity", () => {
    const reset = resetComposerSection(customized, "layout");

    expect(reset.layoutPreset).toBe("editorial-bottom");
    expect(reset.overlay.style).toBe("bottom-fade");
    expect(reset.overlay.opacity).toBe(41);
    expect(reset.text.position).toBe("bottom-left");
    expect(reset.text.headline).toBe("หัวเรื่องที่กำลังเขียน");
    expect(reset.text.fontPreset).toBe("prompt");
    expect(reset.logo.position).toBe("bottom-right");
    expect(reset.logo.sizePct).toBe(17);
  });

  it("resets only text settings to their defaults", () => {
    const reset = resetComposerSection(customized, "text");

    expect(reset.text).toEqual(DEFAULT_COMPOSER_SETTINGS.text);
    expect(reset.themePreset).toBe("warm-clay");
    expect(reset.overlay).toEqual(customized.overlay);
    expect(reset.logo).toEqual(customized.logo);
  });

  it("resets only mood and fade to their defaults", () => {
    const reset = resetComposerSection(customized, "mood");

    expect(reset.themePreset).toBe(DEFAULT_COMPOSER_SETTINGS.themePreset);
    expect(reset.overlay).toEqual(DEFAULT_COMPOSER_SETTINGS.overlay);
    expect(reset.text).toEqual(customized.text);
    expect(reset.logo).toEqual(customized.logo);
  });

  it("resets only logo geometry and opacity", () => {
    const reset = resetComposerSection(customized, "logo");

    expect(reset.logo).toEqual(DEFAULT_COMPOSER_SETTINGS.logo);
    expect(reset.text).toEqual(customized.text);
    expect(reset.overlay).toEqual(customized.overlay);
    expect(reset.themePreset).toBe("warm-clay");
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
