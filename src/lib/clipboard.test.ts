import { describe, expect, it } from "vitest";
import {
  extractClipboardImageFiles,
  isSupportedClipboardImage,
  makeClipboardFilename,
} from "./clipboard";

describe("clipboard image support", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (mime) => {
    expect(isSupportedClipboardImage(mime)).toBe(true);
  });

  it("rejects unsupported clipboard image types", () => {
    expect(isSupportedClipboardImage("image/heic")).toBe(false);
    expect(isSupportedClipboardImage("text/plain")).toBe(false);
  });

  it("creates deterministic unique names for pasted images", () => {
    const now = new Date("2026-10-03T10:17:08.123Z").getTime();

    expect(makeClipboardFilename("image/png", 0, now)).toBe(
      "pasted-image-20261003-101708-123-01.png",
    );
    expect(makeClipboardFilename("image/jpeg", 1, now)).toBe(
      "pasted-image-20261003-101708-123-02.jpg",
    );
  });

  it("extracts supported image items and gives them safe pasted-image names", () => {
    const png = new File(["png"], "image.png", { type: "image/png" });
    const text = new File(["text"], "note.txt", { type: "text/plain" });
    const items = [
      { kind: "file", type: "image/png", getAsFile: () => png },
      { kind: "file", type: "text/plain", getAsFile: () => text },
    ] as unknown as DataTransferItemList;
    const files = [] as unknown as FileList;

    const result = extractClipboardImageFiles(
      { items, files },
      new Date("2026-10-03T10:17:08.123Z").getTime(),
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("image/png");
    expect(result[0].name).toBe("pasted-image-20261003-101708-123-01.png");
  });
});
