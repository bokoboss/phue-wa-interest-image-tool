import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { downloadBlob, makeOutputFilename } from "./lib/files";
import { drawPreview, loadImageFromFile, loadImageFromUrl, renderBrandedBlob } from "./lib/image";
import {
  DEFAULT_SETTINGS,
  type OverlayPosition,
  type OverlaySettings,
} from "./lib/overlay";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STORAGE_KEY = "phue-wa-image-tool-settings-v1";

function loadStoredSettings(): OverlaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as OverlaySettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<OverlaySettings>(loadStoredSettings);
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
        if (!cancelled) {
          setLogoLabel("ยังไม่มีโลโก้ default — เลือกไฟล์ PNG");
        }
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
        if (!cancelled) drawPreview(canvas, image, logoImage, settings);
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

  function updateSetting<K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
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
    if (!logoImage) return;
    setExportStatus("กำลังเตรียมไฟล์…");
    try {
      const result = await renderBrandedBlob(item.file, logoImage, settings);
      downloadBlob(result.blob, makeOutputFilename(item.file.name, result.mime));
      setExportStatus(`Export แล้ว · ${result.width} × ${result.height} px`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "Export ไม่สำเร็จ");
    }
  }

  async function exportAll() {
    if (!logoImage || !images.length) return;
    const zip = new JSZip();

    try {
      for (let i = 0; i < images.length; i += 1) {
        const item = images[i];
        setExportStatus(`กำลัง export ${i + 1}/${images.length}…`);
        const result = await renderBrandedBlob(item.file, logoImage, settings);
        zip.file(makeOutputFilename(item.file.name, result.mime), result.blob);
      }

      setExportStatus("กำลังสร้าง ZIP…");
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "phue-wa-interest-branded-images.zip");
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
          <h1>Image Prep</h1>
          <p className="subtitle">แปะโลโก้ให้รูปก่อนโพสต์ โดยรูปไม่ถูกอัปโหลดออกจากเครื่อง</p>
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
                <canvas ref={canvasRef} aria-label="Preview รูปพร้อมโลโก้" />
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
          <section className="control-card logo-card">
            <div className="control-heading">
              <div>
                <span className="step-number">01</span>
                <h2>โลโก้</h2>
              </div>
              <span className={logoImage ? "status-dot ready" : "status-dot"} />
            </div>
            <p className="logo-label">{logoLabel}</p>
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

          <section className="control-card">
            <div className="control-heading">
              <div>
                <span className="step-number">02</span>
                <h2>ตำแหน่ง</h2>
              </div>
            </div>
            <div className="position-grid">
              {([
                ["top-left", "↖"],
                ["top-right", "↗"],
                ["bottom-left", "↙"],
                ["bottom-right", "↘"],
              ] as [OverlayPosition, string][]).map(([position, icon]) => (
                <button
                  key={position}
                  className={settings.position === position ? "active" : ""}
                  onClick={() => updateSetting("position", position)}
                  aria-label={position}
                >
                  {icon}
                </button>
              ))}
            </div>
          </section>

          <section className="control-card sliders">
            <RangeControl
              label="ขนาดโลโก้"
              value={settings.sizePct}
              min={4}
              max={30}
              step={0.5}
              suffix="%"
              onChange={(value) => updateSetting("sizePct", value)}
            />
            <RangeControl
              label="ระยะจากขอบ"
              value={settings.marginPct}
              min={0}
              max={8}
              step={0.25}
              suffix="%"
              onChange={(value) => updateSetting("marginPct", value)}
            />
            <RangeControl
              label="Opacity"
              value={settings.opacity}
              min={10}
              max={100}
              step={1}
              suffix="%"
              onChange={(value) => updateSetting("opacity", value)}
            />
            <button className="text-button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
              คืนค่าเริ่มต้น
            </button>
          </section>

          <section className="export-card">
            <div>
              <span className="step-number inverse">03</span>
              <h2>Export</h2>
            </div>
            <p>คง pixel dimensions ของต้นฉบับ และใช้ค่าชุดเดียวกับทุกภาพ</p>
            <button
              className="primary-button"
              disabled={!selected || !logoImage || Boolean(exportStatus.startsWith("กำลัง"))}
              onClick={() => selected && void exportOne(selected)}
            >
              Export รูปนี้
            </button>
            <button
              className="primary-button subtle"
              disabled={!images.length || !logoImage || Boolean(exportStatus.startsWith("กำลัง"))}
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
        <span>Metadata/EXIF อาจไม่ถูกเก็บไว้</span>
      </footer>
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
  onChange: (value: number) => void;
};

function RangeControl({ label, value, min, max, step, suffix, onChange }: RangeControlProps) {
  return (
    <label className="range-control">
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
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
