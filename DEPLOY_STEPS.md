# คู่มืออัปเว็บ FIRSTBLUE SNR ให้ใช้งานจริง

## ภาพรวมระบบ

ระบบจริงใช้ 2 ส่วน:

- Vercel: โฮสต์หน้าเว็บและ API
- Supabase: เก็บฐานข้อมูลรหัสดาวน์โหลด และเก็บไฟล์ PDF แบบ private

ไฟล์ PDF จะอัปโหลดไว้ใน Supabase Storage ชื่อ `firstblue-snr.pdf`  
แอดมินจะกดสร้างรหัสในเว็บ แล้วส่งรหัสให้ลูกค้า ลูกค้านำรหัสไปกรอกเพื่อดาวน์โหลด 1 ครั้ง

## ขั้นตอนที่ 1: สร้าง Supabase Project

1. เข้า https://supabase.com
2. สมัครหรือเข้าสู่ระบบ
3. กด `New project`
4. ตั้งชื่อเช่น `firstblue-snr`
5. เลือก region ใกล้ลูกค้า เช่น Singapore
6. ตั้ง database password แล้วกดสร้าง project

## ขั้นตอนที่ 2: สร้างตารางรหัส

1. ใน Supabase ไปที่ `SQL Editor`
2. เปิดไฟล์ `supabase-schema.sql` ในโปรเจกต์นี้
3. คัดลอก SQL ทั้งหมดไปวาง
4. กด `Run`

## ขั้นตอนที่ 3: อัปโหลด PDF

1. ไปที่ `Storage`
2. กด `New bucket`
3. ตั้งชื่อ bucket เป็น `ebooks`
4. ปิด public bucket ไว้ เพื่อให้เป็น private
5. เข้า bucket `ebooks`
6. อัปโหลดไฟล์ PDF แล้วตั้งชื่อไฟล์เป็น `firstblue-snr.pdf`

## ขั้นตอนที่ 4: เตรียมค่า Environment Variables

ใน Supabase ไปที่ `Project Settings` > `API` แล้วจดค่า:

- Project URL
- service_role key

ห้ามเปิดเผย `service_role key` ให้ลูกค้าหรือใส่ไว้ในหน้าเว็บโดยตรง

## ขั้นตอนที่ 5: อัปเว็บขึ้น Vercel

1. เข้า https://vercel.com
2. สมัครหรือเข้าสู่ระบบ
3. สร้าง project ใหม่จากโฟลเดอร์เว็บนี้ หรือ push ขึ้น GitHub แล้ว import repo
4. ในหน้า Environment Variables ใส่ค่าต่อไปนี้:

```text
SUPABASE_URL=ใส่ Project URL จาก Supabase
SUPABASE_SERVICE_ROLE_KEY=ใส่ service_role key จาก Supabase
SUPABASE_BUCKET=ebooks
PDF_FILE_PATH=firstblue-snr.pdf
PDF_FILE_NAME=FIRSTBLUE SNR 169.-.pdf
ADMIN_PASSWORD=ตั้งรหัสแอดมินของคุณเอง
```

5. กด Deploy

## ขั้นตอนที่ 6: ทดสอบระบบจริง

1. เปิด URL จาก Vercel
2. กด `Admin`
3. ใส่รหัสที่ตั้งไว้ใน `ADMIN_PASSWORD`
4. กด `เจนรหัส 1 ครั้ง`
5. คัดลอกรหัส
6. กด `ดาวน์โหลดไฟล์`
7. วางรหัสและกดยืนยัน
8. ดาวน์โหลด PDF
9. ลองใช้รหัสเดิมซ้ำอีกครั้ง ต้องขึ้นว่าใช้ไปแล้ว

## หมายเหตุสำคัญ

- ถ้าจะเปลี่ยน PDF ในอนาคต ให้อัปโหลดไฟล์ใหม่ทับ `firstblue-snr.pdf` ใน Supabase Storage
- ถ้าต้องการขายหลายไฟล์ สามารถเพิ่ม `file_path` แยกตามสินค้าได้
- ระบบนี้ไม่ใช่ระบบชำระเงินอัตโนมัติ แอดมินยังต้องตรวจสลิปหรือคำสั่งซื้อ แล้วค่อยสร้างรหัสให้ลูกค้า
