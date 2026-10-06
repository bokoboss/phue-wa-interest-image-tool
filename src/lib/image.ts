import { preferredOutputMime } from "./files";
import {
  FONT_PRESETS,
  THEME_PRESETS,
  computeTextBox,
  type ComposerSettings,
  type FontPresetId,
} from "./composer";
import { computeOverlayRect } from "./overlay";
import {
  computeImagePlacement,
  computeSquareLogoRect,
  computeSquareRegions,
  deriveAutoSquarePalette,
  mixHexColors,
  normalizeHexColor,
  readableTextPalette,
  SQUARE_MIN_SUBTEXT_SIZE_PCT,
  type Rect,
} from "./square-card";

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

  if (settings.outputMode === "square-card") {
    const size = Math.max(1, Math.floor(Math.min(maxWidth, maxHeight, 900)));
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");

    context.clearRect(0, 0, size, size);
    drawSquareCard(context, source, logo, settings, size);
    return;
  }

  const scale = Math.min(maxWidth / source.naturalWidth, maxHeight / source.naturalHeight, 1);
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  drawFullComposition(context, width, height, logo, settings);
}

export async function renderComposedBlob(
  file: File,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const source = await loadImageFromFile(file);
  await ensureComposerFont(settings.text.fontPreset);

  if (settings.outputMode === "square-card") {
    const size = settings.squareCard.outputSize;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");

    drawSquareCard(context, source, logo, settings, size);

    const mime = "image/jpeg";
    const blob = await canvasToBlob(canvas, mime, 0.95);
    return { blob, mime, width: size, height: size };
  }

  const width = source.naturalWidth;
  const height = source.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.drawImage(source, 0, 0, width, height);
  drawFullComposition(context, width, height, logo, settings);

  const mime = preferredOutputMime(file.type);
  const quality = mime === "image/jpeg" || mime === "image/webp" ? 0.95 : undefined;
  const blob = await canvasToBlob(canvas, mime, quality);

  return { blob, mime, width, height };
}

function drawFullComposition(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
): void {
  drawImageOverlay(context, width, height, settings);
  drawTextBlock(context, width, height, settings);

  if (!logo) return;
  drawLogoInRect(context, logo, { x: 0, y: 0, width, height }, settings);
}

function drawSquareCard(
  context: CanvasRenderingContext2D,
  source: HTMLImageElement,
  logo: HTMLImageElement | null,
  settings: ComposerSettings,
  size: number,
): void {
  const regions = computeSquareRegions(size, settings.squareCard.imageAreaPct);
  const sourcePalette = sampleSourcePalette(source);
  const auto = deriveAutoSquarePalette(sourcePalette.primary, sourcePalette.secondary);
  const theme = THEME_PRESETS[settings.themePreset] ?? THEME_PRESETS["earth-cream"];

  drawSquareImageBackground(context, regions.image, settings, auto);
  const placement = computeImagePlacement(
    { width: source.naturalWidth, height: source.naturalHeight },
    regions.image,
    settings.squareCard.fitMode,
  );

  context.save();
  context.beginPath();
  context.rect(regions.image.x, regions.image.y, regions.image.width, regions.image.height);
  context.clip();

  if (settings.squareCard.fitMode === "contain") {
    context.shadowColor = "rgba(29, 31, 27, 0.22)";
    context.shadowBlur = Math.max(3, size * 0.012);
    context.shadowOffsetY = Math.max(1, size * 0.004);
  }

  context.drawImage(source, placement.x, placement.y, placement.width, placement.height);
  context.restore();

  const panelColor = resolvePanelColor(settings, auto.panel, theme.subtextColor);
  context.fillStyle = panelColor;
  context.fillRect(regions.text.x, regions.text.y, regions.text.width, regions.text.height);

  context.fillStyle = mixHexColors(panelColor, theme.accentColor, 0.24);
  context.fillRect(regions.text.x, regions.text.y, regions.text.width, Math.max(1, size * 0.002));

  if (logo) {
    const logoRect = computeSquareLogoRect(
      regions.image,
      { width: logo.naturalWidth, height: logo.naturalHeight },
      settings.logo,
    );

    context.save();
    context.globalAlpha = settings.logo.opacity / 100;
    context.drawImage(logo, logoRect.x, logoRect.y, logoRect.width, logoRect.height);
    context.restore();
  }

  drawSquarePanelText(context, regions.text, panelColor, settings);
}

function drawSquareImageBackground(
  context: CanvasRenderingContext2D,
  area: Rect,
  settings: ComposerSettings,
  auto: ReturnType<typeof deriveAutoSquarePalette>,
): void {
  if (settings.squareCard.backgroundMode === "custom") {
    context.fillStyle = normalizeHexColor(settings.squareCard.customBackgroundColor);
    context.fillRect(area.x, area.y, area.width, area.height);
    return;
  }

  if (settings.squareCard.backgroundMode === "auto-solid") {
    context.fillStyle = auto.solid;
    context.fillRect(area.x, area.y, area.width, area.height);
    return;
  }

  const gradient = context.createLinearGradient(
    area.x,
    area.y,
    area.x + area.width,
    area.y + area.height,
  );
  gradient.addColorStop(0, auto.imageStart);
  gradient.addColorStop(0.58, auto.solid);
  gradient.addColorStop(1, auto.imageEnd);
  context.fillStyle = gradient;
  context.fillRect(area.x, area.y, area.width, area.height);
}

function resolvePanelColor(
  settings: ComposerSettings,
  autoPanel: string,
  themeBase: string,
): string {
  if (settings.squareCard.panelMode === "custom") {
    return normalizeHexColor(settings.squareCard.customPanelColor, "#F4EBDD");
  }
  if (settings.squareCard.panelMode === "theme") {
    return mixHexColors(themeBase, "#FFFFFF", 0.48);
  }
  return autoPanel;
}

function drawLogoInRect(
  context: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  anchor: Rect,
  settings: ComposerSettings,
): void {
  if (anchor.width <= 0 || anchor.height <= 0) return;

  const rect = computeOverlayRect(
    { width: anchor.width, height: anchor.height },
    { width: logo.naturalWidth, height: logo.naturalHeight },
    settings.logo,
  );

  context.save();
  context.globalAlpha = settings.logo.opacity / 100;
  context.drawImage(
    logo,
    anchor.x + rect.x,
    anchor.y + rect.y,
    rect.width,
    rect.height,
  );
  context.restore();
}

function drawSquarePanelText(
  context: CanvasRenderingContext2D,
  panel: Rect,
  panelColor: string,
  settings: ComposerSettings,
): void {
  const headline = settings.text.headline.trim();
  const subtext = settings.text.subtext.trim();
  if (!headline && !subtext) return;

  const theme = THEME_PRESETS[settings.themePreset] ?? THEME_PRESETS["earth-cream"];
  const font = FONT_PRESETS[settings.text.fontPreset] ?? FONT_PRESETS.kanit;
  const colors = readableTextPalette(panelColor);
  const padding = Math.min(
    panel.width * Math.max(0.035, settings.text.paddingPct / 100),
    panel.height * 0.22,
  );
  const maxWidth = Math.min(
    panel.width - padding * 2,
    panel.width * (Math.max(58, settings.text.widthPct) / 100),
  );
  const availableHeight = Math.max(1, panel.height - padding * 2);

  let headlineSize = Math.max(18, panel.width * (settings.text.headlineSizePct / 100));
  let subtextSize = Math.max(13, panel.width * (settings.text.subtextSizePct / 100));
  const minHeadline = panel.width * 0.027;
  const minSubtext = panel.width * (SQUARE_MIN_SUBTEXT_SIZE_PCT / 100);

  let layout = measurePanelCopy(
    context,
    headline,
    subtext,
    maxWidth,
    headlineSize,
    subtextSize,
    font.canvasStack,
    panel.width,
  );

  let guard = 0;
  while (layout.totalHeight > availableHeight && guard < 24) {
    headlineSize = Math.max(minHeadline, headlineSize * 0.955);
    subtextSize = Math.max(minSubtext, subtextSize * 0.955);
    layout = measurePanelCopy(
      context,
      headline,
      subtext,
      maxWidth,
      headlineSize,
      subtextSize,
      font.canvasStack,
      panel.width,
    );
    guard += 1;
    if (headlineSize <= minHeadline && subtextSize <= minSubtext) break;
  }

  const headlineLines = [...layout.headlineLines];
  const subtextLines = [...layout.subtextLines];
  let totalHeight = layout.totalHeight;

  while (totalHeight > availableHeight && subtextLines.length > 1) {
    subtextLines.pop();
    subtextLines[subtextLines.length - 1] = addEllipsis(subtextLines[subtextLines.length - 1]);
    totalHeight -= layout.subtextLineHeight;
  }

  while (totalHeight > availableHeight && headlineLines.length > 1) {
    headlineLines.pop();
    headlineLines[headlineLines.length - 1] = addEllipsis(headlineLines[headlineLines.length - 1]);
    totalHeight -= layout.headlineLineHeight;
  }

  const contentHeight = Math.min(totalHeight, availableHeight);
  let y = panel.y + (panel.height - contentHeight) / 2;
  const x = panel.x + padding;
  const ruleThickness = Math.max(2, panel.width * 0.003);
  const ruleWidth = Math.max(30, panel.width * 0.065);
  const ruleGap = panel.width * 0.014;

  context.save();
  context.beginPath();
  context.rect(panel.x, panel.y, panel.width, panel.height);
  context.clip();
  context.textAlign = "left";
  context.textBaseline = "top";

  context.fillStyle = theme.accentColor;
  context.fillRect(x, y, ruleWidth, ruleThickness);
  y += ruleThickness + ruleGap;

  if (headlineLines.length) {
    context.font = `700 ${headlineSize}px ${font.canvasStack}`;
    context.fillStyle = colors.headline;
    for (const line of headlineLines) {
      context.fillText(line, x, y, maxWidth);
      y += layout.headlineLineHeight;
    }
  }

  if (headlineLines.length && subtextLines.length) y += layout.blockGap;

  if (subtextLines.length) {
    context.font = `400 ${subtextSize}px ${font.canvasStack}`;
    context.fillStyle = colors.subtext;
    for (const line of subtextLines) {
      context.fillText(line, x, y, maxWidth);
      y += layout.subtextLineHeight;
    }
  }

  context.restore();
}

function measurePanelCopy(
  context: CanvasRenderingContext2D,
  headline: string,
  subtext: string,
  maxWidth: number,
  headlineSize: number,
  subtextSize: number,
  fontStack: string,
  canvasWidth: number,
): {
  headlineLines: string[];
  subtextLines: string[];
  headlineLineHeight: number;
  subtextLineHeight: number;
  blockGap: number;
  totalHeight: number;
} {
  const headlineLineHeight = headlineSize * 1.16;
  const subtextLineHeight = subtextSize * 1.38;
  const blockGap = headline && subtext ? canvasWidth * 0.016 : 0;
  const ruleHeight = Math.max(2, canvasWidth * 0.003) + canvasWidth * 0.014;

  context.font = `700 ${headlineSize}px ${fontStack}`;
  const headlineLines = headline ? wrapText(context, headline, maxWidth) : [];
  context.font = `400 ${subtextSize}px ${fontStack}`;
  const subtextLines = subtext ? wrapText(context, subtext, maxWidth) : [];

  return {
    headlineLines,
    subtextLines,
    headlineLineHeight,
    subtextLineHeight,
    blockGap,
    totalHeight:
      ruleHeight +
      headlineLines.length * headlineLineHeight +
      blockGap +
      subtextLines.length * subtextLineHeight,
  };
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

function sampleSourcePalette(image: HTMLImageElement): {
  primary: string;
  secondary: string;
} {
  const canvas = document.createElement("canvas");
  const size = 40;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { primary: "#8D9277", secondary: "#B66A4D" };

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const left = { r: 0, g: 0, b: 0, count: 0 };
  const right = { r: 0, g: 0, b: 0, count: 0 };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      if (pixels[index + 3] < 96) continue;

      const target = x < size / 2 ? left : right;
      target.r += pixels[index];
      target.g += pixels[index + 1];
      target.b += pixels[index + 2];
      target.count += 1;
    }
  }

  return {
    primary: averageBucket(left, "#8D9277"),
    secondary: averageBucket(right, "#B66A4D"),
  };
}

function averageBucket(
  bucket: { r: number; g: number; b: number; count: number },
  fallback: string,
): string {
  if (!bucket.count) return fallback;
  const channels = [bucket.r, bucket.g, bucket.b].map((sum) =>
    Math.round(sum / bucket.count).toString(16).padStart(2, "0"),
  );
  return `#${channels.join("").toUpperCase()}`;
}


function addEllipsis(line: string): string {
  const trimmed = line.replace(/[…\.]+$/u, "").trimEnd();
  return trimmed ? `${trimmed}…` : "…";
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
