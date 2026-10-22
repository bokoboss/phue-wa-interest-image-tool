import { afterEach, describe, expect, it, vi } from "vitest";
import { withLoadedImageFromFile } from "./image";

const revoke = vi.fn();

class FakeBrowserImage {
  decoding = "async";
  naturalWidth = 1142;
  naturalHeight = 860;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() { return this._src; }
}

describe("image URL lifetime during canvas rendering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    revoke.mockReset();
  });

  function setup() {
    vi.stubGlobal("Image", FakeBrowserImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:photo-picker-image"),
      revokeObjectURL: revoke,
    });
  }

  it("keeps the image object URL valid until the asynchronous export completes", async () => {
    setup();
    const source = new File(["jpeg bytes"], "photo.jpg", { type: "image/jpeg" });
    const output = await withLoadedImageFromFile(source, async (image) => {
      expect(image.naturalWidth).toBe(1142);
      expect(revoke).not.toHaveBeenCalled();
      await Promise.resolve(); // e.g. web-font load or canvas encoding
      expect(revoke).not.toHaveBeenCalled();
      return "exported";
    });

    expect(output).toBe("exported");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:photo-picker-image");
  });

  it("also releases the URL if the renderer fails", async () => {
    setup();
    await expect(
      withLoadedImageFromFile(
        new File(["bytes"], "photo.jpg", { type: "image/jpeg" }),
        async () => { throw new Error("Canvas unavailable"); },
      ),
    ).rejects.toThrow("Canvas unavailable");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:photo-picker-image");
  });
});
