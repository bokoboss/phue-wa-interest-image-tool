import { describe, expect, it } from "vitest";
import { DEFAULT_COMPOSER_SETTINGS } from "./composer";
import { stripPostCopy } from "./persistence";

describe("post copy persistence", () => {
  it("never carries headline or subtext into a new session", () => {
    const stored = stripPostCopy({
      ...DEFAULT_COMPOSER_SETTINGS,
      themePreset: "warm-clay",
      text: {
        ...DEFAULT_COMPOSER_SETTINGS.text,
        headline: "มีพูลวิลล่าเป็นของตัวเองแล้วครับ",
        subtext: "บ้านท่วมครับ แต่ยังอยากเล่าอีกมุมของ กทม.",
        fontPreset: "prompt",
      },
    });

    expect(stored.text.headline).toBe("");
    expect(stored.text.subtext).toBe("");
    expect(stored.text.fontPreset).toBe("prompt");
    expect(stored.themePreset).toBe("warm-clay");
  });

  it("does not mutate the active in-memory settings", () => {
    const active = {
      ...DEFAULT_COMPOSER_SETTINGS,
      text: {
        ...DEFAULT_COMPOSER_SETTINGS.text,
        headline: "กำลังเขียนอยู่",
        subtext: "ยังไม่ควรถูกล้างระหว่างทำงาน",
      },
    };

    stripPostCopy(active);

    expect(active.text.headline).toBe("กำลังเขียนอยู่");
    expect(active.text.subtext).toBe("ยังไม่ควรถูกล้างระหว่างทำงาน");
  });
});
