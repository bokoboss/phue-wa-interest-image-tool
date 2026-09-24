const SUPPORTED_OUTPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function preferredOutputMime(inputMime: string): string {
  return SUPPORTED_OUTPUT_TYPES.has(inputMime) ? inputMime : "image/png";
}

export function makeOutputFilename(originalName: string, outputMime: string): string {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = MIME_EXTENSIONS[outputMime] ?? "png";
  return `${baseName}-branded.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
