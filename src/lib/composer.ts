import { DEFAULT_SETTINGS, type OverlaySettings, type Size } from "./overlay";

export type ImageOverlayStyle = "none" | "bottom-fade" | "top-fade" | "full-tint";
export type TextPosition = "top-left" | "bottom-left" | "center";
export type TextAlign = "left" | "center";
export type ThemePresetId = "earth-cream" | "sage-clay" | "warm-clay";
export type LayoutPresetId = "editorial-bottom" | "editorial-top" | "center-focus";
export type FontPresetId = "kanit" | "prompt" | "ibm-plex-sans-thai" | "sarabun";

export interface ImageOverlaySettings {
  style: ImageOverlayStyle;
  opacity: number;
}

export interface TextSettings {
  headline: string;
  subtext: string;
  position: TextPosition;
  align: TextAlign;
  widthPct: number;
  paddingPct: number;
  headlineSizePct: number;
  subtextSizePct: number;
  fontPreset: FontPresetId;
}

export interface ComposerSettings {
  layoutPreset: LayoutPresetId;
  themePreset: ThemePresetId;
  overlay: ImageOverlaySettings;
  text: TextSettings;
  logo: OverlaySettings;
}

export interface ThemePreset {
  label: string;
  headlineColor: string;
  subtextColor: string;
  accentColor: string;
  overlayColor: string;
}

export interface FontPreset {
  label: string;
  googleFamily: string;
  canvasStack: string;
}

export interface TextBox {
  x: number;
  y: number;
  maxWidth: number;
  align: TextAlign;
  verticalDirection: "down" | "up" | "center";
}

export const OVERLAY_OPACITY_RANGE = {
  min: 0,
  max: 100,
} as const;

export const FONT_PRESETS: Record<FontPresetId, FontPreset> = {
  kanit: {
    label: "Kanit",
    googleFamily: "Kanit",
    canvasStack: '"Kanit", "Leelawadee UI", Tahoma, sans-serif',
  },
  prompt: {
    label: "Prompt",
    googleFamily: "Prompt",
    canvasStack: '"Prompt", "Leelawadee UI", Tahoma, sans-serif',
  },
  "ibm-plex-sans-thai": {
    label: "IBM Plex Sans Thai",
    googleFamily: "IBM Plex Sans Thai",
    canvasStack: '"IBM Plex Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
  },
  sarabun: {
    label: "Sarabun",
    googleFamily: "Sarabun",
    canvasStack: '"Sarabun", "Leelawadee UI", Tahoma, sans-serif',
  },
};

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  "earth-cream": {
    label: "Earth Cream",
    headlineColor: "#F4EBDD",
    subtextColor: "#D8C7AF",
    accentColor: "#B66A4D",
    overlayColor: "#242720",
  },
  "sage-clay": {
    label: "Sage & Clay",
    headlineColor: "#F1E8D6",
    subtextColor: "#D2C5AE",
    accentColor: "#97A07C",
    overlayColor: "#30362D",
  },
  "warm-clay": {
    label: "Warm Clay",
    headlineColor: "#FFF1E5",
    subtextColor: "#E6CDBA",
    accentColor: "#C47756",
    overlayColor: "#352B26",
  },
};

export const DEFAULT_COMPOSER_SETTINGS: ComposerSettings = {
  layoutPreset: "editorial-bottom",
  themePreset: "earth-cream",
  overlay: {
    style: "bottom-fade",
    opacity: 90,
  },
  text: {
    headline: "",
    subtext: "",
    position: "bottom-left",
    align: "left",
    widthPct: 65,
    paddingPct: 5,
    headlineSizePct: 5.6,
    subtextSizePct: 2.25,
    fontPreset: "kanit",
  },
  logo: {
    ...DEFAULT_SETTINGS,
    sizePct: 9,
    marginPct: 2.5,
    opacity: 92,
    position: "bottom-right",
  },
};

export function mergeComposerSettings(
  input?: Partial<ComposerSettings>,
): ComposerSettings {
  const text = {
    ...DEFAULT_COMPOSER_SETTINGS.text,
    ...input?.text,
  };

  if (!text.fontPreset || !(text.fontPreset in FONT_PRESETS)) {
    text.fontPreset = "kanit";
  }

  return {
    ...DEFAULT_COMPOSER_SETTINGS,
    ...input,
    overlay: {
      ...DEFAULT_COMPOSER_SETTINGS.overlay,
      ...input?.overlay,
    },
    text,
    logo: {
      ...DEFAULT_COMPOSER_SETTINGS.logo,
      ...input?.logo,
    },
  };
}

export function migrateV2ComposerSettings(
  input: Partial<ComposerSettings>,
): ComposerSettings {
  const migrated = mergeComposerSettings(input);
  const oldPresetOpacity: Record<LayoutPresetId, number> = {
    "editorial-bottom": 72,
    "editorial-top": 68,
    "center-focus": 52,
  };

  const preset = input.layoutPreset ?? "editorial-bottom";
  if (input.overlay?.opacity === oldPresetOpacity[preset]) {
    migrated.overlay.opacity = DEFAULT_COMPOSER_SETTINGS.overlay.opacity;
  }

  return migrated;
}

export function applyLayoutPreset(
  settings: ComposerSettings,
  preset: LayoutPresetId,
): ComposerSettings {
  const current = mergeComposerSettings(settings);

  if (preset === "editorial-top") {
    return {
      ...current,
      layoutPreset: preset,
      overlay: { ...current.overlay, style: "top-fade" },
      text: {
        ...current.text,
        position: "top-left",
        align: "left",
        widthPct: 65,
      },
      logo: { ...current.logo, position: "bottom-right" },
    };
  }

  if (preset === "center-focus") {
    return {
      ...current,
      layoutPreset: preset,
      overlay: { ...current.overlay, style: "full-tint" },
      text: {
        ...current.text,
        position: "center",
        align: "center",
        widthPct: 78,
      },
      logo: { ...current.logo, position: "bottom-right" },
    };
  }

  return {
    ...current,
    layoutPreset: "editorial-bottom",
    overlay: { ...current.overlay, style: "bottom-fade" },
    text: {
      ...current.text,
      position: "bottom-left",
      align: "left",
      widthPct: 65,
    },
    logo: { ...current.logo, position: "bottom-right" },
  };
}

export function computeTextBox(image: Size, text: TextSettings): TextBox {
  const rawPadding = image.width * (text.paddingPct / 100);
  const padding = Math.min(rawPadding, image.height * 0.2);
  const maxWidth = Math.min(
    image.width * (text.widthPct / 100),
    Math.max(1, image.width - padding * 2),
  );

  if (text.position === "center") {
    return {
      x: image.width / 2,
      y: image.height / 2,
      maxWidth,
      align: "center",
      verticalDirection: "center",
    };
  }

  if (text.position === "top-left") {
    return {
      x: padding,
      y: padding,
      maxWidth,
      align: text.align,
      verticalDirection: "down",
    };
  }

  return {
    x: padding,
    y: image.height - padding,
    maxWidth,
    align: text.align,
    verticalDirection: "up",
  };
}
