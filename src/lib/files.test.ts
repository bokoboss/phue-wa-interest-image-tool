import { describe, expect, it } from "vitest";
import { makeOutputFilename, preferredOutputMime } from "./files";

describe("preferredOutputMime", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("preserves supported image type %s", (mime) => {
    expect(preferredOutputMime(mime)).toBe(mime);
  });

  it("falls back to PNG for unsupported image types", () => {
    expect(preferredOutputMime("image/heic")).toBe("image/png");
  });
});

describe("makeOutputFilename", () => {
  it("adds -branded before the original extension", () => {
    expect(makeOutputFilename("street.photo.JPG", "image/jpeg")).toBe("street.photo-branded.jpg");
  });

  it("uses the output MIME extension when source extension is unsupported", () => {
    expect(makeOutputFilename("photo.heic", "image/png")).toBe("photo-branded.png");
  });

  it("handles names without an extension", () => {
    expect(makeOutputFilename("cover", "image/webp")).toBe("cover-branded.webp");
  });
});
