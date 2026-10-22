import { describe, expect, it } from "vitest";
import { classifyImportFiles, normalizeImportFile } from "./import-images";

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
