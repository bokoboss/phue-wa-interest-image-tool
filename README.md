# เผื่อว่าน่าสนใจ · Post Composer

Mini web app สำหรับเตรียมภาพก่อนโพสต์ Facebook ของเพจ “เผื่อว่าน่าสนใจ” โดยประมวลผลทั้งหมดใน browser ของผู้ใช้

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
- ฟอนต์ใน Canvas ใช้ฟอนต์ระบบที่มีในเครื่อง จึงอาจต่างกันเล็กน้อยระหว่างระบบปฏิบัติการ

## Stack

React + TypeScript + Vite + Canvas API + JSZip + Vitest
