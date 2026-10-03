const SUPPORTED_CLIPBOARD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isSupportedClipboardImage(mime: string): boolean {
  return SUPPORTED_CLIPBOARD_IMAGE_TYPES.has(mime);
}

export function makeClipboardFilename(
  mime: string,
  index: number,
  now = Date.now(),
): string {
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const date = new Date(now);
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("") + "-" + [
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("") + "-" + String(date.getUTCMilliseconds()).padStart(3, "0");

  return `pasted-image-${stamp}-${String(index + 1).padStart(2, "0")}.${extension}`;
}

export function extractClipboardImageFiles(
  clipboardData: Pick<DataTransfer, "items" | "files">,
  now = Date.now(),
): File[] {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && isSupportedClipboardImage(item.type))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  const sourceFiles = itemFiles.length
    ? itemFiles
    : Array.from(clipboardData.files).filter((file) => isSupportedClipboardImage(file.type));

  return sourceFiles.map(
    (file, index) =>
      new File([file], makeClipboardFilename(file.type, index, now), {
        type: file.type,
        lastModified: now,
      }),
  );
}

export function enableClipboardImagePaste(
  target: Window = window,
  root: Document = document,
): () => void {
  const handlePaste = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;

    const files = extractClipboardImageFiles(event.clipboardData);
    if (!files.length) return;

    const input = root.querySelector<HTMLInputElement>('input[type="file"][multiple]');
    if (!input) return;

    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);

    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    event.preventDefault();
  };

  target.addEventListener("paste", handlePaste);
  return () => target.removeEventListener("paste", handlePaste);
}
