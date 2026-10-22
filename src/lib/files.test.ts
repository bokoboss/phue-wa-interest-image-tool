import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, makeOutputFilename, preferredOutputMime } from "./files";

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

describe("downloadBlob in tablet browsers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("attaches a real download anchor before activating it", () => {
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:sample");
    const revokeObjectURL = vi.fn();
    const setTimeout = vi.fn();

    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: { appendChild },
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", { setTimeout });

    downloadBlob(new Blob(["ok"]), "test-card.jpg");

    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(anchor.download).toBe("test-card.jpg");
    expect(setTimeout).toHaveBeenCalledOnce();
  });
});
