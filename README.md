# เผื่อว่าน่าสนใจ · Post Composer

Mini web app สำหรับเตรียมภาพก่อนโพสต์ Facebook ของเพจ “เผื่อว่าน่าสนใจ” โดยประมวลผลทั้งหมดใน browser ของผู้ใช้

## v0.2.1 — Font + stronger overlay

- Overlay default 90% และปรับได้ถึง 100%
- การเปลี่ยน layout จะไม่รีเซ็ต opacity ที่ผู้ใช้ตั้งไว้
- เลือกฟอนต์ไทยได้: Kanit, Prompt, IBM Plex Sans Thai และ Sarabun
- Default font = Kanit (ไม่มีหัว)
- migrate ค่า v0.2 ใน localStorage: ค่า opacity เดิมของ preset จะอัปเกรดเป็น default 90% แต่ค่าที่ผู้ใช้ปรับเองจะถูกเก็บไว้
- Preview และ export รอ web font โหลดก่อนวาดข้อความ เพื่อลดความต่างระหว่างสองผลลัพธ์

## v0.2 — Social post composer

จากเดิมที่เป็นเครื่องมือแปะโลโก้ v0.2 เพิ่มความสามารถทำภาพโพสต์แบบเร็ว:

- Drag & drop / เลือกรูปหลายไฟล์
- รองรับ JPG, PNG และ WebP
- ใส่ headline และ subtext
- Dark overlay / gradient: none, bottom fade, top fade, full tint
- Layout presets: Editorial Bottom, Editorial Top, Center Focus
- Earth-tone theme presets: Earth Cream, Sage & Clay, Warm Clay
- ปรับขนาดหัวเรื่อง, ความกว้าง text block และ safe margin
- ปรับตำแหน่ง, ขนาด, margin และ opacity ของโลโก้
- Preview แบบ real-time
- จำค่าดีไซน์ใน localStorage
- Export รูปเดี่ยว หรือหลายรูปเป็น ZIP
- Export ด้วย pixel dimensions เดิมของภาพต้นฉบับ
- ไม่มี backend และไม่มีการ upload รูปไปที่ server

## Default logo

แอพโหลดโลโก้ของเพจจาก:

```
public/logo.png
```

หากโหลดไม่ได้ ผู้ใช้ยังเลือกโลโก้จากเครื่องได้

## Rendering order

Canvas render ตามลำดับ:

1. ภาพต้นฉบับ
2. Overlay / gradient
3. Headline + subtext + accent rule
4. Logo

ทั้ง preview และ export ใช้ rendering logic ชุดเดียวกัน แต่ export จะสร้าง canvas ตาม natural pixel dimensions ของภาพต้นฉบับ

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

## Deployment

โปรเจกต์เป็น Vite static app จึง deploy ไป Vercel ได้โดยตรง:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Image handling notes

- Pixel dimensions ของภาพ export เท่ากับภาพที่ browser decode ได้จากต้นฉบับ
- JPG และ WebP จะถูก encode ใหม่ที่ quality 95%
- Canvas export โดยทั่วไปจะไม่รักษา EXIF/metadata เดิม
- HEIC ยังไม่รองรับ
- Batch export ทำแบบ sequential เพื่อลด peak memory usage
- ฟอนต์หลักโหลดผ่าน Google Fonts และมี system-font fallback หากโหลดไม่สำเร็จ
- รูปต้นฉบับยังประมวลผลใน browser เท่านั้นและไม่ได้ upload ไปยัง server ของแอพ

## Stack

React + TypeScript + Vite + Canvas API + JSZip + Vitest
