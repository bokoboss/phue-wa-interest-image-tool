export const SUPPORTED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function detectedMime(file: File): string | null {
  const mime = file.type.toLowerCase().trim();
  if (SUPPORTED_IMAGE_MIME.has(mime)) return mime;
  if (mime && mime !== "application/octet-stream") return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[extension] ?? null;
}

export function classifyImportFiles(files: File[] | FileList): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of Array.from(files)) {
    if (detectedMime(file)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}

/** Some Android file pickers return an image with an empty or generic MIME. */
export function normalizeImportFile(file: File): File {
  const type = detectedMime(file);
  if (!type) throw new Error("Only JPG, PNG and WebP images are supported.");
  if (file.type.toLowerCase() === type) return file;
  return new File([file], file.name, {
    type,
    lastModified: file.lastModified,
  });
}

/**
 * A photo provider may hand the browser a short-lived File backed by an
 * Android content URI. Eagerly copy its bytes while the picker grant is valid,
 * so preview, thumbnails and later exports all reuse an independent Blob.
 * A File created from another File is not guaranteed to force the underlying
 * provider to read the bytes immediately.
 */
export async function materializeImportFile(pickerFile: File): Promise<File> {
  const normalizedType = detectedMime(pickerFile);
  if (!normalizedType) throw new Error("Only JPG, PNG and WebP images are supported.");

  const bytes = await pickerFile.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("The selected photo is empty.");

  return new File([bytes], pickerFile.name, {
    type: normalizedType,
    lastModified: pickerFile.lastModified,
  });
}
