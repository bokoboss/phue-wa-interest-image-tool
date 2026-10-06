import type { SquareFitMode } from "./composer";
import { computeOverlayRect, type OverlaySettings, type Size } from "./overlay";

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface SquareRegions {
  image: Rect;
  text: Rect;
}

export const SQUARE_MIN_SUBTEXT_SIZE_PCT = 1.8;

export interface AutoSquarePalette {
  imageStart: string;
  imageEnd: string;
  solid: string;
  panel: string;
}

export function computeSquareRegions(size: number, imageAreaPct: number): SquareRegions {
  const ratio = Math.max(55, Math.min(80, imageAreaPct)) / 100;
  const imageHeight = size * ratio;

  return {
    image: { x: 0, y: 0, width: size, height: imageHeight },
    text: { x: 0, y: imageHeight, width: size, height: size - imageHeight },
  };
}

export function computeImagePlacement(
  source: Size,
  area: Rect,
  fitMode: SquareFitMode,
): Rect {
  if (source.width <= 0 || source.height <= 0 || area.width <= 0 || area.height <= 0) {
    throw new Error("Source and target dimensions must be positive.");
  }

  const scale =
    fitMode === "cover"
      ? Math.max(area.width / source.width, area.height / source.height)
      : Math.min(area.width / source.width, area.height / source.height);

  const width = source.width * scale;
  const height = source.height * scale;

  return {
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - height) / 2,
    width,
    height,
  };
}

export function computeSquareLogoRect(
  imageArea: Rect,
  logo: Size,
  settings: OverlaySettings,
): Rect {
  const relative = computeOverlayRect(
    { width: imageArea.width, height: imageArea.height },
    logo,
    settings,
  );

  return {
    x: imageArea.x + relative.x,
    y: imageArea.y + relative.y,
    width: relative.width,
    height: relative.height,
  };
}

export function mixHexColors(first: string, second: string, secondWeight: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = Math.max(0, Math.min(1, secondWeight));

  return rgbToHex({
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  });
}

export function deriveAutoSquarePalette(
  primary: string,
  secondary = primary,
): AutoSquarePalette {
  const mutedPrimary = mixHexColors(primary, "#817968", 0.18);
  const mutedSecondary = mixHexColors(secondary, "#6F7958", 0.16);

  return {
    imageStart: mixHexColors(mutedPrimary, "#F4EBDD", 0.28),
    imageEnd: mixHexColors(mutedSecondary, "#30362D", 0.22),
    solid: mixHexColors(mutedPrimary, "#D8C7AF", 0.42),
    panel: mixHexColors(mutedPrimary, "#F4EBDD", 0.78),
  };
}

export function readableTextPalette(background: string): {
  headline: string;
  subtext: string;
} {
  return relativeLuminance(background) > 0.48
    ? { headline: "#2F332B", subtext: "#5F6157" }
    : { headline: "#F4EBDD", subtext: "#D8C7AF" };
}

export function normalizeHexColor(value: string, fallback = "#D8C7AF"): string {
  const normalized = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9A-F]{3}$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return fallback;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex).slice(1);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
