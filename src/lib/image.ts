import { preferredOutputMime } from "./files";
import {
  FONT_PRESETS,
  THEME_PRESETS,
  computeTextBox,
  type ComposerSettings,
  type FontPresetId,
} from "./composer";
import { computeOverlayRect } from "./overlay";

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

export async function drawPreview(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
  maxWidth = 1400,
  maxHeight = 900,
): Promise<void> {
  await ensureComposerFont(settings.text.fontPreset);

  const scale = Math.min(maxWidth / source.naturalWidth, maxHeight / source.naturalHeight, 1);
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  drawComposition(context, width, height, logo, settings);
}

export async function renderComposedBlob(
  file: File,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const source = await loadImageFromFile(file);
  await ensureComposerFont(settings.text.fontPreset);
  const width = source.naturalWidth;
  const height = source.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.drawImage(source, 0, 0, width, height);
  drawComposition(context, width, height, logo, settings);

  const mime = preferredOutputMime(file.type);
  const quality = mime === "image/jpeg" || mime === "image/webp" ? 0.95 : undefined;
  const blob = await canvasToBlob(canvas, mime, quality);

  return { blob, mime, width, height };
}

function drawComposition(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
): void {
  drawImageOverlay(context, width, height, settings);
  drawTextBlock(context, width, height, settings);

  if (!logo) return;

  const rect = computeOverlayRect(
    { width, height },
    { width: logo.naturalWidth, height: logo.naturalHeight },
    settings.logo,
  );

  context.save();
  context.globalAlpha = settings.logo.opacity / 100;
  context.drawImage(logo, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawImageOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ComposerSettings,
): void {
  const { style, opacity } = settings.overlay;
  if (style === "none" || opacity <= 0) return;

  const theme = THEME_PRESETS[settings.themePreset] ?? THEME_PRESETS["earth-cream"];
  const alpha = Math.max(0, Math.min(1, opacity / 100));

  context.save();

  if (style === "full-tint") {
    context.fillStyle = rgba(theme.overlayColor, alpha);
    context.fillRect(0, 0, width, height);
    context.restore();
    return;
  }

  const gradient =
    style === "top-fade"
      ? context.createLinearGradient(0, 0, 0, height * 0.74)
      : context.createLinearGradient(0, height * 0.26, 0, height);

  if (style === "top-fade") {
    gradient.addColorStop(0, rgba(theme.overlayColor, alpha));
    gradient.addColorStop(0.52, rgba(theme.overlayColor, alpha * 0.52));
    gradient.addColorStop(1, rgba(theme.overlayColor, 0));
  } else {
    gradient.addColorStop(0, rgba(theme.overlayColor, 0));
    gradient.addColorStop(0.48, rgba(theme.overlayColor, alpha * 0.46));
    gradient.addColorStop(1, rgba(theme.overlayColor, alpha));
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ComposerSettings,
): void {
  const headline = settings.text.headline.trim();
  const subtext = settings.text.subtext.trim();
  if (!headline && !subtext) return;

  const theme = THEME_PRESETS[settings.themePreset] ?? THEME_PRESETS["earth-cream"];
  const font = FONT_PRESETS[settings.text.fontPreset] ?? FONT_PRESETS.kanit;
  const box = computeTextBox({ width, height }, settings.text);
  const headlineSize = Math.max(14, width * (settings.text.headlineSizePct / 100));
  const subtextSize = Math.max(10, width * (settings.text.subtextSizePct / 100));
  const headlineLineHeight = headlineSize * 1.18;
  const subtextLineHeight = subtextSize * 1.42;
  const blockGap = headline && subtext ? width * 0.018 : 0;
  const ruleThickness = Math.max(2, width * 0.0024);
  const ruleWidth = Math.max(24, width * 0.055);
  const ruleGap = width * 0.016;

  context.save();
  context.textBaseline = "top";
  context.textAlign = box.align;

  context.font = `700 ${headlineSize}px ${font.canvasStack}`;
  const headlineLines = headline ? wrapText(context, headline, box.maxWidth) : [];
  context.font = `400 ${subtextSize}px ${font.canvasStack}`;
  const subtextLines = subtext ? wrapText(context, subtext, box.maxWidth) : [];

  const totalHeight =
    ruleThickness +
    ruleGap +
    headlineLines.length * headlineLineHeight +
    blockGap +
    subtextLines.length * subtextLineHeight;

  let y =
    box.verticalDirection === "up"
      ? box.y - totalHeight
      : box.verticalDirection === "center"
        ? box.y - totalHeight / 2
        : box.y;

  const ruleX = box.align === "center" ? box.x - ruleWidth / 2 : box.x;
  context.fillStyle = theme.accentColor;
  context.fillRect(ruleX, y, ruleWidth, ruleThickness);
  y += ruleThickness + ruleGap;

  if (headlineLines.length) {
    context.font = `700 ${headlineSize}px ${font.canvasStack}`;
    context.fillStyle = theme.headlineColor;
    context.shadowColor = "rgba(0, 0, 0, 0.18)";
    context.shadowBlur = Math.max(0, width * 0.002);
    for (const line of headlineLines) {
      context.fillText(line, box.x, y, box.maxWidth);
      y += headlineLineHeight;
    }
  }

  if (headlineLines.length && subtextLines.length) y += blockGap;

  if (subtextLines.length) {
    context.shadowBlur = 0;
    context.font = `400 ${subtextSize}px ${font.canvasStack}`;
    context.fillStyle = theme.subtextColor;
    for (const line of subtextLines) {
      context.fillText(line, box.x, y, box.maxWidth);
      y += subtextLineHeight;
    }
  }

  context.restore();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const result: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }

    const words = trimmed.split(/\s+/u);
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        result.push(line);
        line = "";
      }

      if (context.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }

      let chunk = "";
      for (const char of Array.from(word)) {
        const next = chunk + char;
        if (chunk && context.measureText(next).width > maxWidth) {
          result.push(chunk);
          chunk = char;
        } else {
          chunk = next;
        }
      }
      line = chunk;
    }

    if (line) result.push(line);
  }

  return result;
}

async function ensureComposerFont(fontPreset: FontPresetId): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const font = FONT_PRESETS[fontPreset] ?? FONT_PRESETS.kanit;
  await Promise.allSettled([
    document.fonts.load(`400 32px "${font.googleFamily}"`),
    document.fonts.load(`700 32px "${font.googleFamily}"`),
  ]);
}

function rgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
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
