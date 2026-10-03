import type { ComposerSettings } from "./composer";

const DESIGN_STORAGE_KEYS = [
  "phue-wa-image-tool-settings-v3",
  "phue-wa-image-tool-settings-v2",
] as const;

type StoredComposerLike = Partial<ComposerSettings> & {
  text?: Partial<ComposerSettings["text"]>;
};

export function stripPostCopy<T extends StoredComposerLike>(settings: T): T {
  if (!settings.text) return { ...settings };

  return {
    ...settings,
    text: {
      ...settings.text,
      headline: "",
      subtext: "",
    },
  } as T;
}

export function clearPersistedPostCopy(storage: Storage = localStorage): void {
  for (const key of DESIGN_STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as StoredComposerLike;
      storage.setItem(key, JSON.stringify(stripPostCopy(parsed)));
    } catch {
      // Leave malformed legacy values alone; App already falls back safely.
    }
  }
}
