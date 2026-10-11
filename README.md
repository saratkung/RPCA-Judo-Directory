# ทำเนียบสมาชิกชมรมยูโด โรงเรียนนายร้อยตำรวจ

เว็บแอปทำเนียบสมาชิกที่ใช้ **Google Sheets เป็นฐานข้อมูลหลัก** และเชื่อมต่อกับ **LINE Official Account**
ให้สมาชิกค้นหารายชื่อผ่านแชตได้ สร้างด้วย Next.js (App Router) + TypeScript + Tailwind CSS

> ⚠️ **สถานะปัจจุบัน**: โค้ดทั้งหมดพร้อมใช้งาน แต่ **ยังไม่ได้เชื่อมต่อกับ Google Sheets และ LINE OA จริง**
> เพราะยังไม่มี Credentials จริง เว็บไซต์จึงทำงานด้วย **ข้อมูลตัวอย่าง** (`data/sample-members.ts`) โดยอัตโนมัติ
> จนกว่าเจ้าของระบบจะตั้งค่า Environment Variables ตามคู่มือด้านล่าง — เมื่อตั้งค่าแล้วเว็บไซต์จะสลับไปอ่านจาก Google Sheets จริงให้เองโดยไม่ต้องแก้โค้ด

---

## สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
3. [โครงสร้าง Google Sheets](#โครงสร้าง-google-sheets)
4. [ขั้นตอนที่ 1 — สร้าง Google Cloud Project](#ขั้นตอนที่-1--สร้าง-google-cloud-project)
5. [ขั้นตอนที่ 2 — เปิดใช้งาน Google Sheets API](#ขั้นตอนที่-2--เปิดใช้งาน-google-sheets-api)
6. [ขั้นตอนที่ 3 — สร้าง Service Account](#ขั้นตอนที่-3--สร้าง-service-account)
7. [ขั้นตอนที่ 4 — แชร์ Spreadsheet ให้ Service Account](#ขั้นตอนที่-4--แชร์-spreadsheet-ให้-service-account)
8. [ขั้นตอนที่ 5 — ตั้งค่า Environment Variables](#ขั้นตอนที่-5--ตั้งค่า-environment-variables)
9. [ขั้นตอนที่ 6 — รันในเครื่อง](#ขั้นตอนที่-6--รันในเครื่อง)
10. [ขั้นตอนที่ 7 — Deploy ขึ้น Vercel](#ขั้นตอนที่-7--deploy-ขึ้น-vercel)
11. [ขั้นตอนที่ 8 — ตั้งค่า LINE Developers และ Messaging API](#ขั้นตอนที่-8--ตั้งค่า-line-developers-และ-messaging-api)
12. [ขั้นตอนที่ 9 — ตั้ง Webhook URL](#ขั้นตอนที่-9--ตั้ง-webhook-url)
13. [ขั้นตอนที่ 10 — สร้าง Rich Menu](#ขั้นตอนที่-10--สร้าง-rich-menu)
14. [ขั้นตอนที่ 11 — ทดสอบการค้นหาและการซิงก์ข้อมูล](#ขั้นตอนที่-11--ทดสอบการค้นหาและการซิงก์ข้อมูล)
15. [ขั้นตอนที่ 12 — แก้ปัญหาที่พบบ่อย](#ขั้นตอนที่-12--แก้ปัญหาที่พบบ่อย)
16. [เรื่องความปลอดภัยและเบอร์โทรศัพท์](#เรื่องความปลอดภัยและเบอร์โทรศัพท์)
17. [รายการที่เจ้าของระบบต้องทำเอง (Checklist)](#รายการที่เจ้าของระบบต้องทำเอง-checklist)

---

## ภาพรวมระบบ

- **Next.js App Router + TypeScript** — เว็บไซต์และ API ทั้งหมด
- **Tailwind CSS** — ธีมสีขาว/กรมท่า แบบ Minimal เป็นทางการ
- **Google Sheets API** (อ่านอย่างเดียว) — ฐานข้อมูลสมาชิกหลัก ผ่าน Service Account ฝั่งเซิร์ฟเวอร์เท่านั้น
- **LINE Messaging API** — Webhook รับคำสั่งแชตค้นหาสมาชิก
- **Vercel** — แพลตฟอร์ม Deploy ที่แนะนำ

สถาปัตยกรรมสำคัญ:

- เบราว์เซอร์ **ไม่สามารถเข้าถึง** Service Account Credentials ได้เลย (อยู่ใน Environment Variables ฝั่งเซิร์ฟเวอร์เท่านั้น)
- เว็บไซต์และ LINE Webhook ใช้ตรรกะค้นหาเดียวกันจาก `lib/members-service.ts`
- ข้อมูลที่ส่งออกสู่สาธารณะ (API, เว็บไซต์, LINE) **ไม่มีเบอร์โทรศัพท์รวมอยู่เลย** ตั้งแต่ระดับ TypeScript type (ดูหัวข้อความปลอดภัยด้านล่าง)

## โครงสร้างโปรเจกต์

```
app/
  page.tsx                     หน้าหลักทำเนียบสมาชิก (Server Component)
  members/[id]/page.tsx        หน้ารายละเอียดสมาชิก
  api/members/route.ts         GET รายชื่อสมาชิก (รองรับค้นหา/กรอง)
  api/members/[id]/route.ts    GET สมาชิกรายคน
  api/revalidate/route.ts      POST บังคับรีเฟรชข้อมูลจาก Google Sheets
  api/line/webhook/route.ts    LINE Messaging API Webhook
components/                    MemberCard, SearchBar, FilterSelect, StateMessage ฯลฯ
lib/
  env.ts                       อ่าน/ตรวจสอบ Environment Variables
  sheets.ts                    อ่านข้อมูลจาก Google Sheets (server-only)
  members-service.ts           รวม sheets + sample data + ค้นหา/กรอง (ใช้ร่วมกันทั้งเว็บและ LINE)
  line.ts                      ตรวจสอบ Signature + ส่ง Reply กลับ LINE
  line-commands.ts             แปลข้อความแชตเป็นคำตอบ
  validate.ts                  sanitize input, ตรวจ URL รูปภาพ
  rate-limit.ts                จำกัดอัตราการเรียก API แบบง่าย
data/
  sample-members.ts            ข้อมูลตัวอย่าง (ใช้ตอนยังไม่เชื่อม Google Sheets)
  sample-members.csv           ข้อมูลตัวอย่างชุดเดียวกัน สำหรับนำเข้า Google Sheets จริงเพื่อทดสอบ
public/default-avatar.svg      ภาพโปรไฟล์เริ่มต้น
```

## โครงสร้าง Google Sheets

สร้างชีตชื่อ **`Members`** แถวแรกเป็นหัวตาราง (ตัวพิมพ์เล็กเหมือนตัวอย่าง):

| member_id | full_name | rank | nickname | generation | club_position | phone | photo_url |
|---|---|---|---|---|---|---|---|

ข้อสำคัญ:

- **คอลัมน์ `phone` ต้องตั้งรูปแบบเป็น "Plain text"** (Format → Number → Plain text) ก่อนพิมพ์ข้อมูล ไม่เช่นนั้นเลข 0 นำหน้าเบอร์โทรจะหายไป
- `member_id` ต้องไม่ซ้ำกันและห้ามเว้นว่าง — แถวที่ไม่มี `member_id` จะถูกข้ามไปและมีคำเตือนใน Log ฝั่งเซิร์ฟเวอร์ (ระบบจะไม่สร้างรหัสใหม่ให้เอง เพราะจะทำให้ลิงก์โปรไฟล์เปลี่ยนไปเรื่อย ๆ)
- แถวที่มี `member_id` ซ้ำกัน ระบบจะใช้ข้อมูลแถวแรกที่เจอเท่านั้น
- เว้น `photo_url` ว่างได้ ระบบจะใช้ภาพโปรไฟล์เริ่มต้นให้อัตโนมัติ
- สามารถเพิ่มคอลัมน์ใหม่ต่อจาก H ได้ในอนาคต เพราะระบบอ่านคอลัมน์ตาม **ชื่อหัวตาราง** ไม่ใช่ตำแหน่งคอลัมน์ตายตัว
- ใช้ไฟล์ `data/sample-members.csv` เป็นตัวอย่างสำหรับนำเข้า (Import) เพื่อทดสอบได้ทันที (ข้อมูลในไฟล์นี้เป็นข้อมูลสมมติทั้งหมด ไม่ใช่สมาชิกจริง)

---

## ขั้นตอนที่ 1 — สร้าง Google Cloud Project

1. เข้า [console.cloud.google.com](https://console.cloud.google.com/)
2. คลิกเลือกโปรเจกต์ (มุมซ้ายบน) → **โปรเจกต์ใหม่**
3. ตั้งชื่อ เช่น `judo-club-directory` แล้วสร้าง

## ขั้นตอนที่ 2 — เปิดใช้งาน Google Sheets API

1. ในโปรเจกต์ที่สร้าง ไปที่ **APIs & Services → Library**
2. ค้นหา **Google Sheets API** แล้วกด **Enable**

## ขั้นตอนที่ 3 — สร้าง Service Account

1. ไปที่ **APIs & Services → Credentials → Create Credentials → Service Account**
2. ตั้งชื่อ เช่น `judo-directory-reader` แล้วกด **Create and Continue** (ไม่ต้องให้สิทธิ์ระดับโปรเจกต์ เพราะจะให้สิทธิ์ตรงที่ตัว Spreadsheet แทน) → **Done**
3. คลิกเข้า Service Account ที่สร้าง → แท็บ **Keys → Add Key → Create new key → JSON**
4. ไฟล์ JSON จะดาวน์โหลดลงเครื่อง — เก็บไว้เป็นความลับ **ห้ามอัปโหลดเข้า Git**
5. จากไฟล์ JSON นี้ จะใช้ 2 ค่า:
   - `client_email` → ไปใส่ใน `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → ไปใส่ใน `GOOGLE_PRIVATE_KEY`

## ขั้นตอนที่ 4 — แชร์ Spreadsheet ให้ Service Account

1. เปิด Google Sheet ที่จะใช้เป็นฐานข้อมูล (มีชีตชื่อ `Members` ตามโครงสร้างด้านบน)
2. กด **Share** → ใส่อีเมลจาก `client_email` ของ Service Account → ให้สิทธิ์ **Viewer** (อ่านอย่างเดียวพอ เพราะเว็บไซต์ไม่เขียนกลับ) → Share
3. **ห้ามเปิดชีตเป็น "Anyone with the link"** — แชร์ให้เฉพาะอีเมล Service Account เท่านั้น
4. คัดลอก Spreadsheet ID จาก URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

## ขั้นตอนที่ 5 — ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าให้ครบ:

```
GOOGLE_SHEETS_SPREADSHEET_ID=<จาก URL ของ Spreadsheet>
GOOGLE_SHEETS_RANGE=Members!A:H
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email จากไฟล์ JSON>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
LINE_CHANNEL_SECRET=<จาก LINE Developers Console>
LINE_CHANNEL_ACCESS_TOKEN=<จาก LINE Developers Console>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

ข้อควรระวัง:

- `GOOGLE_PRIVATE_KEY` ต้องคงบรรทัด `-----BEGIN PRIVATE KEY-----` และ `-----END PRIVATE KEY-----` ไว้ และครอบด้วยเครื่องหมายคำพูด `"..."` โค้ดจะแปลง `\n` เป็นการขึ้นบรรทัดใหม่ให้อัตโนมัติ
- ห้ามตั้งชื่อตัวแปร Secret ให้ขึ้นต้นด้วย `NEXT_PUBLIC_` (มีแต่ `NEXT_PUBLIC_APP_URL` ที่ไม่ใช่ Secret)
- `.env.local` ถูกใส่ใน `.gitignore` ไว้แล้ว ห้าม commit เข้า Git โดยเด็ดขาด

## ขั้นตอนที่ 6 — รันในเครื่อง

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

- ถ้ายังไม่ตั้งค่า Google Sheets ในขั้นตอนที่ 5 เว็บไซต์จะแสดง **ข้อมูลตัวอย่าง** พร้อมป้ายกำกับ "กำลังแสดงข้อมูลตัวอย่าง" ให้เห็นชัดเจนว่ายังไม่เชื่อมต่อจริง
- เมื่อตั้งค่าแล้ว รีสตาร์ท `npm run dev` ป้ายกำกับจะหายไปและข้อมูลจะมาจาก Google Sheets จริง

## ขั้นตอนที่ 7 — Deploy ขึ้น Vercel

1. Push โค้ดขึ้น GitHub (อย่าลืมตรวจว่า `.env.local` ไม่ถูก commit)
2. เข้า [vercel.com](https://vercel.com/) → **Add New Project** → เลือก Repository นี้
3. ในหน้า **Environment Variables** ของโปรเจกต์ Vercel ให้เพิ่มตัวแปรทั้งหมดจาก `.env.local` (รวม `GOOGLE_PRIVATE_KEY` ที่มี `\n`)
4. ตั้ง `NEXT_PUBLIC_APP_URL` เป็น URL จริงของเว็บไซต์หลัง Deploy เช่น `https://judo-directory.vercel.app`
5. กด **Deploy**
6. หลัง Deploy สำเร็จ ให้กลับไปอัปเดตค่า `NEXT_PUBLIC_APP_URL` อีกครั้งถ้า Vercel สุ่ม URL ให้ต่างจากที่ตั้งไว้ แล้ว Redeploy

## ขั้นตอนที่ 8 — ตั้งค่า LINE Developers และ Messaging API

1. เข้า [developers.line.biz/console](https://developers.line.biz/console/)
2. สร้าง **Provider** (ถ้ายังไม่มี)
3. สร้าง **Channel** ประเภท **Messaging API**
4. ในหน้า Channel → แท็บ **Messaging API**:
   - คัดลอก **Channel secret** (อยู่แท็บ Basic settings) → ใส่ใน `LINE_CHANNEL_SECRET`
   - ที่ **Channel access token** กด **Issue** เพื่อสร้าง Long-lived token → ใส่ใน `LINE_CHANNEL_ACCESS_TOKEN`
5. เพิ่มตัวแปรทั้งสองนี้ทั้งในเครื่อง (`.env.local`) และบน Vercel แล้ว Redeploy

## ขั้นตอนที่ 9 — ตั้ง Webhook URL

1. ในหน้า Channel → แท็บ **Messaging API** → ส่วน **Webhook settings**
2. ตั้งค่า Webhook URL เป็น: `https://<โดเมนเว็บไซต์ของคุณ>/api/line/webhook`
3. กด **Verify** — ถ้าตั้งค่า `LINE_CHANNEL_SECRET` ถูกต้องและ Deploy แล้ว จะเห็นผลลัพธ์สำเร็จ
4. เปิด **Use webhook** เป็น **Enabled**
5. ปิด **Auto-reply messages** และ **Greeting messages** ของ LINE Official Account Manager ถ้าต้องการให้บอทตอบเฉพาะคำสั่งที่กำหนดเท่านั้น

## ขั้นตอนที่ 10 — สร้าง Rich Menu

สร้างผ่าน [LINE Official Account Manager](https://manager.line.biz/) → เมนู **Rich menu** → **Create**

แนะนำแบ่ง 4 ช่อง (2x2):

| ช่อง | ข้อความ/ป้าย | Action ที่ตั้ง |
|---|---|---|
| 1 | ทำเนียบสมาชิก | Type: Link → URL เว็บไซต์หลัก (`https://<โดเมน>/`) |
| 2 | ค้นหาสมาชิก | Type: Text → ข้อความแนะนำ เช่น "พิมพ์ ค้นหา ตามด้วยชื่อ เช่น ค้นหา สมชาย" |
| 3 | ค้นหาตามรุ่น | Type: Text → ข้อความแนะนำ เช่น "พิมพ์ รุ่น ตามด้วยหมายเลขรุ่น เช่น รุ่น 78" |
| 4 | ติดต่อแอดมิน | Type: Link → ลิงก์แชตส่วนตัวของแอดมิน หรือ URL เว็บไซต์ที่มีข้อมูลติดต่อ |

ขั้นตอน:

1. อัปโหลดภาพพื้นหลังเมนู (แนะนำขนาด 2500x1686px หรือ 2500x843px สำหรับเมนูแถวเดียว)
2. วาดกรอบ Tappable area ทับแต่ละช่องแล้วตั้ง Action ตามตารางด้านบน
3. ตั้งเป็น **Default rich menu** เพื่อให้สมาชิกทุกคนเห็นเมนูนี้อัตโนมัติ
4. **ต้องทำหลัง Deploy เว็บไซต์เสร็จแล้วเท่านั้น** เพราะต้องใช้ URL จริงของเว็บไซต์ในช่องที่ 1

## ขั้นตอนที่ 11 — ทดสอบการค้นหาและการซิงก์ข้อมูล

**ทดสอบเว็บไซต์:**

1. เปิดหน้าหลัก ลองค้นหาชื่อ/ชื่อเล่น/ยศ/รุ่น/ตำแหน่ง — ผลลัพธ์ต้องกรองแบบพิมพ์บางส่วนได้ (ไม่ต้องพิมพ์ครบคำ)
2. ลองตัวกรองรุ่นและตำแหน่งร่วมกับการค้นหา และกดปุ่ม "รีเซ็ตตัวกรอง"
3. คลิกการ์ดสมาชิกเพื่อเข้าหน้ารายละเอียด ตรวจว่า URL เป็น `/members/<member_id>` และไม่มีเบอร์โทรศัพท์แสดงอยู่เลย

**ทดสอบการซิงก์ข้อมูล:**

1. แก้ไขข้อมูลแถวหนึ่งใน Google Sheets (เช่น เปลี่ยนตำแหน่งในชมรม)
2. กดปุ่ม **"รีเฟรช"** บนเว็บไซต์ — ข้อมูลต้องอัปเดตทันที
3. หรือรอประมาณ 45 วินาทีโดยไม่กดอะไร — ข้อมูลจะอัปเดตอัตโนมัติจากการรีเฟรชพื้นหลัง

**ทดสอบ LINE:**

1. เพิ่มเพื่อน LINE OA ด้วย QR Code หรือ Basic ID (ดูได้จากหน้า Channel)
2. พิมพ์ `ทำเนียบสมาชิก`, `ช่วยเหลือ`, `ค้นหา <ชื่อ>`, `รุ่น <เลขรุ่น>` แล้วตรวจคำตอบ
3. ลองค้นหาคำที่มีคนตรงเกิน 5 คน — ต้องเห็นข้อความแจ้งว่าพบทั้งหมดกี่คนและให้ระบุชื่อเพิ่ม
4. ลองค้นหาคำที่ไม่มีใครตรง — ต้องได้ข้อความแจ้งว่าไม่พบ ไม่ใช่ข้อความ error ดิบ

> หมายเหตุ: ขั้นตอนทั้งหมดในหัวข้อนี้ต้องใช้ Credentials จริงของ Google และ LINE — ทีมพัฒนายังไม่ได้ทดสอบกับบริการจริงเพราะยังไม่ได้รับ Credentials เหล่านี้

## ขั้นตอนที่ 12 — แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| เว็บไซต์แสดง "กำลังแสดงข้อมูลตัวอย่าง" ตลอด | ยังไม่ได้ตั้งหรือตั้งค่า Environment Variables ของ Google ไม่ครบ | ตรวจ `.env.local` (หรือ Vercel) ว่ามีค่าทั้ง 3 ตัวของ Google ครบและไม่มีช่องว่างเกิน |
| หน้าเว็บแสดง "ไม่สามารถโหลดข้อมูลสมาชิกได้" | Service Account ไม่มีสิทธิ์เข้าถึงชีต หรือ Spreadsheet ID/ชื่อชีตผิด | ตรวจว่าแชร์ชีตให้ `client_email` แล้ว และ `GOOGLE_SHEETS_RANGE` ตรงกับชื่อชีต (ตัวพิมพ์เล็ก-ใหญ่และเว้นวรรคต้องตรงกัน) |
| เบอร์โทรในชีตเป็น 0 นำหน้าแล้วหายไป | คอลัมน์ `phone` ไม่ได้ตั้งเป็น Plain text | เลือกคอลัมน์ → Format → Number → Plain text แล้วพิมพ์ใหม่ |
| สมาชิกบางคนไม่ขึ้นในเว็บไซต์ | แถวนั้นไม่มี `member_id` หรือ `member_id` ซ้ำกับแถวอื่น | ดู Log ฝั่งเซิร์ฟเวอร์ (Vercel → Deployments → Logs) จะมีคำเตือนระบุชื่อแถวที่มีปัญหา แล้วแก้ในชีต |
| ปุ่ม Verify ของ LINE Webhook ไม่ผ่าน | Deploy ยังไม่เสร็จ, URL ผิด, หรือ `LINE_CHANNEL_SECRET` ไม่ตรง | ตรวจ URL ต้องเป็น `https://.../api/line/webhook` และ Channel secret ตรงกับที่ตั้งใน Environment Variables |
| LINE ไม่ตอบกลับเลย | Webhook ปิดอยู่, หรือพิมพ์คำสั่งไม่ตรงรูปแบบ | เปิด "Use webhook", ตรวจว่าพิมพ์ตรงรูปแบบ เช่น `ค้นหา ชื่อ` (มีเว้นวรรค) |
| Build บน Vercel ล้มเหลว | ขาด Environment Variable บางตัว ทำให้ TypeScript/Runtime error | ตรวจว่าตั้งค่าตัวแปรทุกตัวใน Vercel Project Settings → Environment Variables ครบตามสภาพแวดล้อม (Production/Preview) |

---

## เรื่องความปลอดภัยและเบอร์โทรศัพท์

เวอร์ชันนี้ **ไม่เปิดเผยเบอร์โทรศัพท์ของสมาชิกต่อสาธารณะเลย** ทั้งบนเว็บไซต์ หน้ารายละเอียด API และ LINE —
เป็นการตัดสินใจออกแบบตามหลัก Data Minimization เพราะในสคีมาปัจจุบันยังไม่มีกลไกยืนยันความยินยอม (consent) หรือระบบสิทธิ์ผู้ใช้ (login) ที่ตรวจสอบได้จริงฝั่งเซิร์ฟเวอร์

ในทางเทคนิค ชนิดข้อมูล `PublicMember` (ดู `lib/types.ts`) **ไม่มีฟิลด์ phone อยู่เลย** ทุกจุดที่ส่งข้อมูลออกสู่สาธารณะ (API, เว็บไซต์, LINE) จึงไม่มีทางส่งเบอร์โทรออกไปโดยไม่ตั้งใจ

หากในอนาคตต้องการเปิดให้เห็นเบอร์โทรเฉพาะสมาชิกที่ Login แล้ว ต้องเพิ่มเติม:

1. ระบบยืนยันตัวตนสมาชิก (เช่น LINE Login ผูกกับ member_id พร้อมการตรวจสอบสิทธิ์ฝั่งเซิร์ฟเวอร์จริง ไม่ใช่แค่เชื่อ LINE User ID)
2. คอลัมน์ consent ในชีต (เช่น `phone_visible`) ที่เจ้าของข้อมูลกรอกยินยอมเอง
3. API endpoint ใหม่ที่ตรวจสอบทั้งสองเงื่อนไขก่อนส่งเบอร์โทรกลับ

มาตรการอื่นที่ทำไว้แล้ว:

- URL รูปภาพถูกตรวจสอบให้เป็น HTTPS ที่ถูกต้องก่อนแสดงผลเสมอ (ไม่ใช่เช่นนั้นจะใช้ภาพเริ่มต้นแทน)
- ข้อความค้นหาจากทั้งเว็บไซต์และ LINE ถูก sanitize และจำกัดความยาวก่อนนำไปค้นหา
- API และ LINE Webhook มีการจำกัดอัตราเรียกใช้แบบพื้นฐาน (in-memory) และจะไม่แสดง Stack Trace เมื่อเกิดข้อผิดพลาด
- LINE Webhook ตรวจสอบ Signature ด้วย HMAC-SHA256 จาก Raw Body ทุกครั้งก่อนประมวลผล

---

## รายการที่เจ้าของระบบต้องทำเอง (Checklist)

ทีมพัฒนาส่งมอบโค้ดที่รันได้จริงพร้อมข้อมูลตัวอย่าง แต่สิ่งต่อไปนี้ **ต้องทำโดยเจ้าของระบบ** เพราะต้องใช้บัญชี/สิทธิ์ขององค์กรเท่านั้น:

- [ ] สร้าง Google Cloud Project และเปิด Google Sheets API (ขั้นตอนที่ 1–2)
- [ ] สร้าง Service Account และดาวน์โหลดคีย์ JSON (ขั้นตอนที่ 3)
- [ ] สร้าง Google Sheet จริงตามโครงสร้างคอลัมน์ที่กำหนด และกรอกข้อมูลสมาชิกจริง
- [ ] แชร์ Sheet ให้อีเมล Service Account เป็น Viewer เท่านั้น (ขั้นตอนที่ 4)
- [ ] ใส่ค่า Environment Variables ทั้งหมดใน `.env.local` และใน Vercel Project Settings (ขั้นตอนที่ 5, 7)
- [ ] Deploy เว็บไซต์ขึ้น Vercel จริง และยืนยันว่าเข้าถึงได้ (ขั้นตอนที่ 7)
- [ ] สร้าง LINE Official Account / Channel แบบ Messaging API (ขั้นตอนที่ 8)
- [ ] ตั้งค่า Webhook URL และกด Verify + เปิดใช้งาน (ขั้นตอนที่ 9)
- [ ] ออกแบบและอัปโหลดภาพ Rich Menu จริง พร้อมตั้ง Action ตามคู่มือ (ขั้นตอนที่ 10)
- [ ] ทดสอบค้นหาและการซิงก์ข้อมูลกับบริการจริงปลายทาง ก่อนประกาศให้สมาชิกใช้งาน (ขั้นตอนที่ 11)
- [ ] กำหนดนโยบายการเผยแพร่ข้อมูลสมาชิกและขอความยินยอมจากสมาชิกตามความเหมาะสม ก่อนนำรายชื่อขึ้นระบบจริง

> 🔒 ทีมพัฒนา**ไม่มี**และ**ไม่ได้ขอ**ข้อมูลสมาชิกจริงหรือ Credentials จริงของ Google/LINE ในการพัฒนานี้
> ทุกอย่างถูกทดสอบด้วยข้อมูลตัวอย่างที่สร้างขึ้นเท่านั้น
