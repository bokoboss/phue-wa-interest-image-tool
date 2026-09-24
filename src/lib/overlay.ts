export type OverlayPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface OverlaySettings {
  sizePct: number;
  marginPct: number;
  opacity: number;
  position: OverlayPosition;
}

export interface Size {
  width: number;
  height: number;
}

export interface OverlayRect extends Size {
  x: number;
  y: number;
}

export const DEFAULT_SETTINGS: OverlaySettings = {
  sizePct: 10,
  marginPct: 2.5,
  opacity: 90,
  position: "bottom-right",
};

export function computeOverlayRect(
  image: Size,
  logo: Size,
  settings: OverlaySettings,
): OverlayRect {
  if (image.width <= 0 || image.height <= 0 || logo.width <= 0 || logo.height <= 0) {
    throw new Error("Image and logo dimensions must be positive.");
  }

  const margin = image.width * (settings.marginPct / 100);
  let width = image.width * (settings.sizePct / 100);
  let height = width * (logo.height / logo.width);

  const maxHeight = Math.max(1, image.height - margin * 2);
  if (height > maxHeight) {
    const scale = maxHeight / height;
    width *= scale;
    height *= scale;
  }

  const isRight = settings.position.endsWith("right");
  const isBottom = settings.position.startsWith("bottom");

  const x = isRight ? image.width - margin - width : margin;
  const y = isBottom ? image.height - margin - height : margin;

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width,
    height,
  };
}
