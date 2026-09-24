import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { downloadBlob, makeOutputFilename } from "./lib/files";
import { drawPreview, loadImageFromFile, loadImageFromUrl, renderComposedBlob } from "./lib/image";
import {
  DEFAULT_COMPOSER_SETTINGS,
  FONT_PRESETS,
  OVERLAY_OPACITY_RANGE,
  THEME_PRESETS,
  applyLayoutPreset,
  mergeComposerSettings,
  migrateV2ComposerSettings,
  resetComposerSection,
  type ComposerSettings,
  type FontPresetId,
  type ImageOverlayStyle,
  type LayoutPresetId,
  type TextPosition,
  type ThemePresetId,
} from "./lib/composer";
import type { OverlayPosition } from "./lib/overlay";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STORAGE_KEY = "phue-wa-image-tool-settings-v3";
const V2_STORAGE_KEY = "phue-wa-image-tool-settings-v2";
const LEGACY_STORAGE_KEY = "phue-wa-image-tool-settings-v1";

const LAYOUT_OPTIONS: Array<{ id: LayoutPresetId; label: string; caption: string }> = [
  { id: "editorial-bottom", label: "Editorial Bottom", caption: "ข้อความล่าง · fade จากล่าง" },
  { id: "editorial-top", label: "Editorial Top", caption: "ข้อความบน · fade จากบน" },
  { id: "center-focus", label: "Center Focus", caption: "ข้อความกลาง · tint ทั้งภาพ" },
];

const OVERLAY_OPTIONS: Array<{ id: ImageOverlayStyle; label: string }> = [
  { id: "none", label: "ไม่ใช้" },
  { id: "bottom-fade", label: "Fade ล่าง" },
  { id: "top-fade", label: "Fade บน" },
  { id: "full-tint", label: "Tint ทั้งภาพ" },
];

const TEXT_POSITION_OPTIONS: Array<{ id: TextPosition; label: string }> = [
  { id: "top-left", label: "บนซ้าย" },
  { id: "bottom-left", label: "ล่างซ้าย" },
  { id: "center", label: "กลาง" },
];

function loadStoredSettings(): ComposerSettings {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return mergeComposerSettings(JSON.parse(current) as Partial<ComposerSettings>);

    const v2 = localStorage.getItem(V2_STORAGE_KEY);
    if (v2) return migrateV2ComposerSettings(JSON.parse(v2) as Partial<ComposerSettings>);

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      return mergeComposerSettings({
        logo: JSON.parse(legacy),
      });
    }
  } catch {
    // Fall back to defaults if a previous browser value is invalid.
  }

  return mergeComposerSettings(DEFAULT_COMPOSER_SETTINGS);
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ComposerSettings>(loadStoredSettings);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoLabel, setLogoLabel] = useState("กำลังตรวจหา logo.png…");
  const [isDragging, setIsDragging] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = useMemo(
    () => images.find((item) => item.id === selectedId) ?? images[0] ?? null,
    [images, selectedId],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    loadImageFromUrl("/logo.png")
      .then((image) => {
        if (!cancelled) {
          setLogoImage(image);
          setLogoLabel("โลโก้เพจ · logo.png");
        }
      })
      .catch(() => {
        if (!cancelled) setLogoLabel("ยังไม่มีโลโก้ default — เลือกไฟล์ PNG");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selected) return;

    let cancelled = false;
    loadImageFromFile(selected.file)
      .then((image) => {
        if (cancelled) return undefined;
        return drawPreview(canvas, image, logoImage, settings);
      })
      .catch(() => {
        if (!cancelled) {
          const context = canvas.getContext("2d");
          context?.clearRect(0, 0, canvas.width, canvas.height);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected, logoImage, settings]);

  async function addFiles(fileList: FileList | File[]) {
    const accepted = Array.from(fileList).filter((file) => ACCEPTED_TYPES.has(file.type));
    if (!accepted.length) return;

    const items = await Promise.all(
      accepted.map(async (file) => {
        const image = await loadImageFromFile(file);
        return {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
      }),
    );

    setImages((current) => [...current, ...items]);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((item) => item.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  function updateText<K extends keyof ComposerSettings["text"]>(
    key: K,
    value: ComposerSettings["text"][K],
  ) {
    setSettings((current) => ({
      ...current,
      text: { ...current.text, [key]: value },
    }));
  }

  function updateOverlay<K extends keyof ComposerSettings["overlay"]>(
    key: K,
    value: ComposerSettings["overlay"][K],
  ) {
    setSettings((current) => ({
      ...current,
      overlay: { ...current.overlay, [key]: value },
    }));
  }

  function updateLogo<K extends keyof ComposerSettings["logo"]>(
    key: K,
    value: ComposerSettings["logo"][K],
  ) {
    setSettings((current) => ({
      ...current,
      logo: { ...current.logo, [key]: value },
    }));
  }

  function selectLayout(preset: LayoutPresetId) {
    setSettings((current) => applyLayoutPreset(current, preset));
  }

  function selectTheme(themePreset: ThemePresetId) {
    setSettings((current) => ({ ...current, themePreset }));
  }

  function resetSection(section: "layout" | "text" | "mood" | "logo") {
    setSettings((current) => resetComposerSection(current, section));
  }

  function resetDesign() {
    setSettings((current) => ({
      ...mergeComposerSettings(DEFAULT_COMPOSER_SETTINGS),
      text: {
        ...DEFAULT_COMPOSER_SETTINGS.text,
        headline: current.text.headline,
        subtext: current.text.subtext,
      },
    }));
  }

  async function chooseLogo(file?: File) {
    if (!file || !ACCEPTED_TYPES.has(file.type)) return;
    try {
      const image = await loadImageFromFile(file);
      setLogoImage(image);
      setLogoLabel(file.name);
    } catch {
      setLogoLabel("อ่านไฟล์โลโก้ไม่สำเร็จ");
    }
  }

  async function exportOne(item: ImageItem) {
    setExportStatus("กำลังเตรียมไฟล์…");
    try {
      const result = await renderComposedBlob(item.file, logoImage, settings);
      downloadBlob(result.blob, makeOutputFilename(item.file.name, result.mime));
      setExportStatus(`Export แล้ว · ${result.width} × ${result.height} px`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Export ไม่สำเร็จ");
    }
  }

  async function exportAll() {
    if (!images.length) return;
    const zip = new JSZip();

    try {
      for (let i = 0; i < images.length; i += 1) {
        const item = images[i];
        setExportStatus(`กำลัง export ${i + 1}/${images.length}…`);
        const result = await renderComposedBlob(item.file, logoImage, settings);
        zip.file(makeOutputFilename(item.file.name, result.mime), result.blob);
      }

      setExportStatus("กำลังสร้าง ZIP…");
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "phue-wa-interest-post-images.zip");
      setExportStatus(`พร้อมใช้ · ${images.length} รูป`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Export ไม่สำเร็จ");
    }
  }

  function clearAll() {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setImages([]);
    setSelectedId(null);
    setExportStatus("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">เผื่อว่าน่าสนใจ</p>
          <h1>Post Composer</h1>
          <p className="subtitle">ใส่ภาพ · ทำ fade · วางข้อความ · แปะโลโก้ · export พร้อมโพสต์</p>
        </div>
        <span className="privacy-pill">ทำงานใน browser เท่านั้น</span>
      </header>

      <main className="workspace">
        <section className="editor-panel">
          {images.length === 0 ? (
            <button
              className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
              onClick={() => imageInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void addFiles(event.dataTransfer.files);
              }}
            >
              <span className="drop-icon">＋</span>
              <strong>ลากรูปมาวางตรงนี้</strong>
              <span>หรือคลิกเพื่อเลือกหลายรูป · JPG / PNG / WebP</span>
            </button>
          ) : (
            <>
              <div
                className={`preview-stage ${isDragging ? "is-dragging" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  void addFiles(event.dataTransfer.files);
                }}
              >
                <canvas ref={canvasRef} aria-label="Preview ภาพโพสต์พร้อมข้อความและโลโก้" />
              </div>

              <div className="image-strip-header">
                <div>
                  <strong>{images.length} รูป</strong>
                  {selected && <span>{selected.width} × {selected.height} px</span>}
                </div>
                <div className="mini-actions">
                  <button onClick={() => imageInputRef.current?.click()}>＋ เพิ่มรูป</button>
                  <button onClick={clearAll}>ล้างทั้งหมด</button>
                </div>
              </div>

              <div className="image-strip">
                {images.map((item, index) => (
                  <div
                    className={`thumb ${selected?.id === item.id ? "is-selected" : ""}`}
                    key={item.id}
                  >
                    <button className="thumb-main" onClick={() => setSelectedId(item.id)}>
                      <img src={item.previewUrl} alt="" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </button>
                    <button
                      className="thumb-remove"
                      onClick={() => removeImage(item.id)}
                      aria-label={`ลบ ${item.file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <input
            ref={imageInputRef}
            className="hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </section>

        <aside className="controls-panel">
          <section className="control-card">
            <ControlHeading step="01" title="Layout" onReset={() => resetSection("layout")} />
            <div className="layout-grid">
              {LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={settings.layoutPreset === option.id ? "preset-button active" : "preset-button"}
                  onClick={() => selectLayout(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.caption}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-card">
            <ControlHeading step="02" title="ข้อความ" onReset={() => resetSection("text")} />

            <p className="section-label">ฟอนต์</p>
            <div className="font-grid">
              {(Object.entries(FONT_PRESETS) as Array<[FontPresetId, (typeof FONT_PRESETS)[FontPresetId]]>).map(
                ([id, font]) => (
                  <button
                    key={id}
                    className={settings.text.fontPreset === id ? "font-button active" : "font-button"}
                    style={{ fontFamily: font.canvasStack }}
                    onClick={() => updateText("fontPreset", id)}
                  >
                    {font.label}
                  </button>
                ),
              )}
            </div>
            <p className="font-note">ค่าเริ่มต้น: Kanit · ไม่มีหัว</p>

            <label className="field-control">
              <span>Headline</span>
              <textarea
                rows={3}
                maxLength={180}
                placeholder="เช่น ถ้ารื้อทางด่วนกลางเมืองออก จะเกิดอะไรขึ้น?"
                value={settings.text.headline}
                onChange={(event) => updateText("headline", event.target.value)}
              />
              <small>{settings.text.headline.length}/180</small>
            </label>

            <label className="field-control">
              <span>Subtext</span>
              <textarea
                rows={2}
                maxLength={240}
                placeholder="ข้อความรองสั้น ๆ (ถ้ามี)"
                value={settings.text.subtext}
                onChange={(event) => updateText("subtext", event.target.value)}
              />
            </label>

            <div className="segmented-grid three">
              {TEXT_POSITION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={settings.text.position === option.id ? "active" : ""}
                  onClick={() => {
                    updateText("position", option.id);
                    updateText("align", option.id === "center" ? "center" : "left");
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="compact-sliders">
              <RangeControl
                label="ขนาดหัวเรื่อง"
                value={settings.text.headlineSizePct}
                min={3.5}
                max={9}
                step={0.1}
                suffix="%"
                onChange={(value) => updateText("headlineSizePct", value)}
              />
              <RangeControl
                label="ความกว้างข้อความ"
                value={settings.text.widthPct}
                min={42}
                max={90}
                step={1}
                suffix="%"
                onChange={(value) => updateText("widthPct", value)}
              />
              <RangeControl
                label="ระยะจากขอบ"
                value={settings.text.paddingPct}
                min={2}
                max={10}
                step={0.25}
                suffix="%"
                onChange={(value) => updateText("paddingPct", value)}
              />
            </div>
          </section>

          <section className="control-card">
            <ControlHeading step="03" title="Mood & Fade" onReset={() => resetSection("mood")} />
            <p className="section-label">โทนสี</p>
            <div className="theme-grid">
              {(Object.entries(THEME_PRESETS) as Array<[ThemePresetId, (typeof THEME_PRESETS)[ThemePresetId]]>).map(
                ([id, theme]) => (
                  <button
                    key={id}
                    className={settings.themePreset === id ? "theme-button active" : "theme-button"}
                    onClick={() => selectTheme(id)}
                  >
                    <span className="theme-swatches" aria-hidden="true">
                      <i style={{ background: theme.headlineColor }} />
                      <i style={{ background: theme.accentColor }} />
                      <i style={{ background: theme.overlayColor }} />
                    </span>
                    <strong>{theme.label}</strong>
                  </button>
                ),
              )}
            </div>

            <p className="section-label">Overlay</p>
            <div className="segmented-grid two">
              {OVERLAY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={settings.overlay.style === option.id ? "active" : ""}
                  onClick={() => updateOverlay("style", option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <RangeControl
              label="ความเข้ม"
              value={settings.overlay.opacity}
              min={OVERLAY_OPACITY_RANGE.min}
              max={OVERLAY_OPACITY_RANGE.max}
              step={1}
              suffix="%"
              disabled={settings.overlay.style === "none"}
              onChange={(value) => updateOverlay("opacity", value)}
            />
          </section>

          <section className="control-card logo-card">
            <div className="control-heading">
              <div>
                <span className="step-number">04</span>
                <h2>โลโก้</h2>
              </div>
              <div className="control-heading-actions">
                <button
                  className="section-reset-button"
                  type="button"
                  onClick={() => resetSection("logo")}
                  title="คืนค่าโลโก้ส่วนนี้เป็นค่าเริ่มต้น"
                >
                  คืนค่า
                </button>
                <span className={logoImage ? "status-dot ready" : "status-dot"} />
              </div>
            </div>

            <p className="logo-label">{logoLabel}</p>

            <div className="position-grid">
              {([
                ["top-left", "↖"],
                ["top-right", "↗"],
                ["bottom-left", "↙"],
                ["bottom-right", "↘"],
              ] as [OverlayPosition, string][]).map(([position, icon]) => (
                <button
                  key={position}
                  className={settings.logo.position === position ? "active" : ""}
                  onClick={() => updateLogo("position", position)}
                  aria-label={position}
                >
                  {icon}
                </button>
              ))}
            </div>

            <div className="compact-sliders">
              <RangeControl
                label="ขนาดโลโก้"
                value={settings.logo.sizePct}
                min={4}
                max={24}
                step={0.5}
                suffix="%"
                onChange={(value) => updateLogo("sizePct", value)}
              />
              <RangeControl
                label="ระยะจากขอบ"
                value={settings.logo.marginPct}
                min={0}
                max={8}
                step={0.25}
                suffix="%"
                onChange={(value) => updateLogo("marginPct", value)}
              />
              <RangeControl
                label="Opacity"
                value={settings.logo.opacity}
                min={10}
                max={100}
                step={1}
                suffix="%"
                onChange={(value) => updateLogo("opacity", value)}
              />
            </div>

            <button className="secondary-button full" onClick={() => logoInputRef.current?.click()}>
              เลือกโลโก้อื่น
            </button>
            <input
              ref={logoInputRef}
              className="hidden-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                void chooseLogo(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </section>

          <button className="reset-button" onClick={resetDesign}>คืนค่าดีไซน์ทั้งหมด</button>

          <section className="export-card">
            <div>
              <span className="step-number inverse">05</span>
              <h2>Export</h2>
            </div>
            <p>ใช้ดีไซน์ชุดเดียวกับทุกภาพ และคง pixel dimensions ของต้นฉบับ</p>
            <button
              className="primary-button"
              disabled={!selected || Boolean(exportStatus.startsWith("กำลัง"))}
              onClick={() => selected && void exportOne(selected)}
            >
              Export รูปนี้
            </button>
            <button
              className="primary-button subtle"
              disabled={!images.length || Boolean(exportStatus.startsWith("กำลัง"))}
              onClick={() => void exportAll()}
            >
              Export ทั้งหมดเป็น ZIP
            </button>
            {exportStatus && <p className="export-status">{exportStatus}</p>}
          </section>
        </aside>
      </main>

      <footer>
        <span>Original pixel dimensions preserved</span>
        <span>JPEG / WebP export ที่ quality 95%</span>
        <span>ข้อความและ gradient ถูก render ลงไฟล์จริง</span>
        <span>Metadata/EXIF อาจไม่ถูกเก็บไว้</span>
      </footer>
    </div>
  );
}

function ControlHeading({
  step,
  title,
  onReset,
}: {
  step: string;
  title: string;
  onReset?: () => void;
}) {
  return (
    <div className="control-heading">
      <div>
        <span className="step-number">{step}</span>
        <h2>{title}</h2>
      </div>
      {onReset && (
        <button
          className="section-reset-button"
          type="button"
          onClick={onReset}
          title={`คืนค่า ${title} เป็นค่าเริ่มต้น`}
        >
          คืนค่า
        </button>
      )}
    </div>
  );
}

type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  disabled = false,
  onChange,
}: RangeControlProps) {
  return (
    <label className={disabled ? "range-control is-disabled" : "range-control"}>
      <span>
        <strong>{label}</strong>
        <output>{value}{suffix}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
