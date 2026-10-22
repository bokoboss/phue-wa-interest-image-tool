import { describe, expect, it } from "vitest";
import { classifyImportFiles, normalizeImportFile, materializeImportFile } from "./import-images";

describe("tablet file picker compatibility", () => {
  it("accepts images without MIME when they have a known photo extension", () => {
    const pickerFile = new File(["photo"], "Camera_003.JPG", { type: "" });
    const { accepted, rejected } = classifyImportFiles([pickerFile]);

    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
    expect(normalizeImportFile(pickerFile).type).toBe("image/jpeg");
  });

  it("accepts explicit JPG, PNG and WebP MIME types", () => {
    const files = [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.png", { type: "image/png" }),
      new File(["c"], "c.webp", { type: "image/webp" }),
    ];
    expect(classifyImportFiles(files).accepted).toHaveLength(3);
  });

  it("rejects HEIC and unrelated files explicitly rather than silently skipping them", () => {
    const files = [
      new File(["heic"], "portrait.heic", { type: "image/heic" }),
      new File(["pdf"], "invoice.pdf", { type: "application/pdf" }),
    ];
    const { accepted, rejected } = classifyImportFiles(files);
    expect(accepted).toHaveLength(0);
    expect(rejected.map((file) => file.name)).toEqual(["portrait.heic", "invoice.pdf"]);
  });

  it("does not trust a jpg extension when MIME is an incompatible document", () => {
    const fakeImage = new File(["x"], "fake.jpg", { type: "text/plain" });
    expect(classifyImportFiles([fakeImage]).accepted).toHaveLength(0);
  });
});

describe("mobile photo picker lifetime", () => {
  it("takes a self-contained byte snapshot of an imported picker file", async () => {
    // Some Android photo providers expose only a short-lived backing resource.
    const original = new File([new Uint8Array([255, 216, 8, 7, 6, 255, 217])], "Gallery.jpg", {
      type: "image/jpeg",
    });
    const read = original.arrayBuffer.bind(original);
    let permissionGranted = true;
    let reads = 0;
    Object.defineProperty(original, "arrayBuffer", {
      value: async () => {
        reads += 1;
        if (!permissionGranted) throw new Error("Photo picker grant expired");
        return read();
      },
    });

    const stable = await materializeImportFile(original);
    permissionGranted = false;

    expect(stable).not.toBe(original);
    expect(stable.name).toBe("Gallery.jpg");
    expect(stable.type).toBe("image/jpeg");
    expect(reads).toBe(1);
    expect(new Uint8Array(await stable.arrayBuffer())).toEqual(
      new Uint8Array([255, 216, 8, 7, 6, 255, 217]),
    );
  });

  it("copies bytes and infers a MIME when Android Photos gives an empty MIME", async () => {
    const source = new File([new Uint8Array([1, 2, 3, 4])], "DSC001.JPG", { type: "" });
    const stable = await materializeImportFile(source);
    expect(stable.type).toBe("image/jpeg");
    expect([...new Uint8Array(await stable.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });
});
