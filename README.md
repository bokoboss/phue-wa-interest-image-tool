# เผื่อว่าน่าสนใจ · Image Prep

Mini web app สำหรับใส่โลโก้เพจลงบนรูปก่อนโพสต์ Facebook โดยประมวลผลทั้งหมดใน browser ของผู้ใช้

## MVP v0.1

- Drag & drop / เลือกรูปหลายไฟล์
- รองรับ JPG, PNG และ WebP
- Preview โลโก้แบบ real-time
- ปรับ 4 ตำแหน่ง, ขนาด, margin และ opacity
- ค่าตั้งต้นถูกจำใน localStorage
- Export รูปเดี่ยว หรือหลายรูปเป็น ZIP
- Export ด้วย pixel dimensions เดิมของภาพต้นฉบับ
- ไม่มี backend และไม่มีการ upload รูปไปที่ server

## Default logo

แอพจะพยายามโหลดไฟล์นี้อัตโนมัติ:

```
public/logo.png
```

ให้นำไฟล์โลโก้ PNG ของเพจวางไว้ที่ path นี้ แล้ว deploy ใหม่ แอพจะพร้อมใช้โดยไม่ต้องเลือกโลโก้ทุกครั้ง

ถ้ายังไม่มีไฟล์ดังกล่าว ผู้ใช้สามารถกด **เลือกโลโก้อื่น** ในหน้าแอพได้ทันที

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
- HEIC ยังไม่อยู่ใน MVP
- Batch export ทำแบบ sequential เพื่อลด peak memory usage

## Stack

React + TypeScript + Vite + Canvas API + JSZip + Vitest
