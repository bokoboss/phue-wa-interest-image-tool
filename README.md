# เผื่อว่าน่าสนใจ · Post Composer

Mini web app สำหรับเตรียมภาพก่อนโพสต์ Facebook ของเพจ “เผื่อว่าน่าสนใจ” โดยประมวลผลทั้งหมดใน browser ของผู้ใช้

## v0.4 — Square Card polish

- เพิ่ม slider **ขนาดข้อความรอง** 1.8–5.0% สำหรับทั้ง Full Image และ Square Card
- Full Image และ Square Card จำ typography แยกกัน: headline/subtext size, text width และ padding
- Full Image และ Square Card จำ logo position / size / margin / opacity แยกกัน
- migration ครั้งแรกจะคัดลอกค่าที่เคยจูนร่วมกันไปเป็นค่าเริ่มต้นของ Square Card เพื่อไม่ให้ดีไซน์เดิมหาย
- Cover mode เลือกตำแหน่ง crop ได้ ซ้าย/กลาง/ขวา และ บน/กลาง/ล่าง
- เพิ่ม **Blurred Photo** background: ใช้ภาพต้นฉบับขยายเต็มกรอบและเบลอไว้ด้านหลังภาพแบบ Contain
- reset ข้อความ/โลโก้จะรีเซ็ต style เฉพาะ output mode ที่กำลังใช้อยู่ ส่วน headline/subtext ยังคงเป็น content ร่วมกัน

## v0.3.2 — Subtext readability

- เพิ่ม default Subtext จาก 2.25% เป็น 2.8%
- ค่า 2.25% เดิมที่ถูกเก็บไว้จะ migrate เป็น 2.8% อัตโนมัติ
- Square Card ไม่ auto-shrink Subtext ต่ำกว่า 1.8% ของความกว้าง card
- ค่าที่ผู้ใช้ตั้งเองซึ่งไม่ใช่ 2.25% จะถูกเก็บไว้ตามเดิม

## v0.3 — Square Card 1:1

เพิ่ม output mode ใหม่โดยยังคง Full Image mode เดิมไว้ครบ:

- **Full Image** — ใช้ pixel dimensions เดิมของภาพต้นฉบับ พร้อม fade / text / logo แบบเดิม
- **Square Card 1:1** — ภาพอยู่ด้านบน พื้นที่ข้อความถูกล็อกไว้ด้านล่าง
- Square export เลือกได้ 1080×1080 หรือ 2048×2048
- ปรับสัดส่วนพื้นที่ภาพ 55–80% (default 68%)
- การวางภาพ:
  - Contain — เห็นภาพครบ
  - Cover — เต็มพื้นที่และ crop เท่าที่จำเป็น
- พื้นหลังเมื่อภาพไม่เต็ม:
  - Auto Gradient — ดึงโทนสีจากภาพแล้วสร้าง gradient
  - Auto Solid — ดึงโทนสีจากภาพเป็นสีพื้น
  - Custom — เลือกสีเอง
- พื้นที่ข้อความด้านล่าง:
  - Auto — ใช้สีที่ derive จากภาพ
  - Theme — ใช้สีจาก earth-tone theme
  - Custom — เลือกสีเอง
- สีข้อความใน panel ปรับ light/dark อัตโนมัติตาม contrast
- ถ้าข้อความยาวเกินพื้นที่ ระบบจะลดขนาดตัวอักษรและตัดท้ายด้วย ellipsis เมื่อจำเป็น
- โลโก้ถูกจำกัดให้อยู่ในพื้นที่ภาพ ไม่ทับ text panel
- Preview และ export ใช้ rendering logic ชุดเดียวกัน
- Square Card export เป็น JPEG quality 95%
- design preferences ถูกจำใน localStorage แต่ headline/subtext ไม่ถูก persist ข้าม session

## v0.2.4 — Fresh post copy

- Headline/Subtext เริ่มว่างทุก session
- Design preferences เช่น font, layout, theme, fade และ logo settings ยังจำต่อ
- ป้องกันข้อความจากโพสต์ก่อนหน้าติดมากับภาพใหม่

## v0.2.3 — Clipboard paste

- รองรับการวางภาพที่ copy มาจาก clipboard ด้วย `Ctrl+V` / `Cmd+V`
- ใช้ได้ทั้ง screenshot และภาพที่ copy มาจากแอพ/เว็บที่ส่งข้อมูลเป็น JPG, PNG หรือ WebP
- ภาพที่ paste จะเข้า flow เดียวกับ drag & drop / file picker และนำไป preview, batch และ export ได้ทันที
- ตั้งชื่อไฟล์ที่ paste ให้อัตโนมัติแบบ unique เพื่อลดโอกาสชื่อชนกันเวลา export ZIP
- ถ้า clipboard มีแต่ข้อความ จะไม่ intercept การ paste ปกติในช่อง Headline/Subtext

## v0.2.2 — Per-section reset

- เพิ่มปุ่ม **คืนค่า** ในแต่ละส่วน
- Reset ข้อความคืน content + formatting เป็นค่าเริ่มต้น
- Reset Mood & Fade คืน Earth Cream + Bottom Fade + 90%
- Reset โลโก้คืน position / size / margin / opacity โดยไม่เปลี่ยนไฟล์โลโก้ที่เลือก
- ปุ่ม **คืนค่าดีไซน์ทั้งหมด** ยังคง headline/subtext ที่กำลังเขียนไว้

## v0.2.1 — Font + stronger overlay

- Overlay default 90% และปรับได้ถึง 100%
- เลือกฟอนต์ไทยได้: Kanit, Prompt, IBM Plex Sans Thai และ Sarabun
- Default font = Kanit (ไม่มีหัว)
- Preview และ export รอ web font โหลดก่อนวาดข้อความ

## Default logo

แอพโหลดโลโก้ของเพจจาก:

```
public/logo.png
```

หากโหลดไม่ได้ ผู้ใช้ยังเลือกโลโก้จากเครื่องได้

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

Vite static app:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Image handling notes

- Full Image mode คง pixel dimensions ตามภาพที่ browser decode ได้
- Square Card mode export 1080×1080 หรือ 2048×2048
- JPG / WebP re-encode ที่ quality 95%
- Canvas export โดยทั่วไปจะไม่รักษา EXIF/metadata เดิม
- HEIC ยังไม่รองรับ
- Batch export ทำแบบ sequential เพื่อลด peak memory usage
- ฟอนต์หลักโหลดผ่าน Google Fonts และมี system-font fallback
- รูปต้นฉบับประมวลผลใน browser และไม่ได้ upload ไป backend

## Stack

React + TypeScript + Vite + Canvas API + JSZip + Vitest
