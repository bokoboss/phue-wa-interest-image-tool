import { preferredOutputMime } from "./files";
import { computeOverlayRect, type OverlaySettings } from "./overlay";

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
    image.src = url;
  });
}

export function drawPreview(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement,
  logo: HTMLImageElement | null,
  settings: OverlaySettings,
  maxWidth = 1400,
  maxHeight = 900,
): void {
  const scale = Math.min(maxWidth / source.naturalWidth, maxHeight / source.naturalHeight, 1);
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  if (!logo) return;

  const rect = computeOverlayRect(
    { width, height },
    { width: logo.naturalWidth, height: logo.naturalHeight },
    settings,
  );

  context.save();
  context.globalAlpha = settings.opacity / 100;
  context.drawImage(logo, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

export async function renderBrandedBlob(
  file: File,
  logo: HTMLImageElement,
  settings: OverlaySettings,
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const source = await loadImageFromFile(file);
  const width = source.naturalWidth;
  const height = source.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.drawImage(source, 0, 0, width, height);

  const rect = computeOverlayRect(
    { width, height },
    { width: logo.naturalWidth, height: logo.naturalHeight },
    settings,
  );

  context.save();
  context.globalAlpha = settings.opacity / 100;
  context.drawImage(logo, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  const mime = preferredOutputMime(file.type);
  const quality = mime === "image/jpeg" || mime === "image/webp" ? 0.95 : undefined;
  const blob = await canvasToBlob(canvas, mime, quality);

  return { blob, mime, width, height };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Browser could not encode the exported image."));
      },
      mime,
      quality,
    );
  });
}
