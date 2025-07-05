# Google Sheets Integration Setup

ระบบจะบันทึกรายรับรายจ่ายของแต่ละ user ลงใน Google Sheets โดยอัตโนมัติ

## 📋 ขั้นตอนการตั้งค่า

### 1. สร้าง Google Cloud Project และ Service Account

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. เปิดใช้งาน Google Sheets API:
   - ไปที่ "APIs & Services" > "Enable APIs and Services"
   - ค้นหา "Google Sheets API" และกดเปิดใช้งาน

### 2. สร้าง Service Account

1. ไปที่ "IAM & Admin" > "Service Accounts"
2. กด "Create Service Account"
3. ตั้งชื่อ Service Account (เช่น "sheets-bot")
4. กด "Create and Continue"
5. ข้าม Role (ไม่จำเป็น) และกด "Continue"
6. กด "Done"

### 3. สร้าง Service Account Key

1. คลิกที่ Service Account ที่สร้างไว้
2. ไปที่แท็บ "Keys"
3. กด "Add Key" > "Create new key"
4. เลือก "JSON" และกด "Create"
5. ไฟล์ JSON จะถูกดาวน์โหลด

### 4. ติดตั้งไฟล์ Key ในโปรเจค

1. เปลี่ยนชื่อไฟล์ที่ดาวน์โหลดเป็น `google-service-account.json`
2. วางไฟล์ในโฟลเดอร์รากของโปรเจค:
   ```
   /Users/ls/Documents/work/train-claude-code/google-service-account.json
   ```

### 5. แชร์ Google Sheets ให้กับ Service Account

1. เปิด Google Sheets ที่ต้องการ: https://docs.google.com/spreadsheets/d/1lKigYFWiZ5n5_JHV1KLJi93tPJcCVbl26k59nVu6_fw/edit
2. กด "Share" (แชร์)
3. ใส่ Email ของ Service Account (จากไฟล์ JSON ในส่วน `client_email`)
4. ตั้งสิทธิ์เป็น "Editor"
5. กด "Send"

## 🧪 ทดสอบการเชื่อมต่อ

### 1. ทดสอบการเชื่อมต่อ
```bash
curl http://localhost:3000/google-sheets/test
```

### 2. เพิ่มข้อมูลทดสอบ
```bash
curl -X POST http://localhost:3000/google-sheets/test-record
```

### 3. ดูข้อมูลล่าสุดใน Sheets
```bash
curl http://localhost:3000/google-sheets/recent?limit=5
```

## 📊 โครงสร้างข้อมูลใน Google Sheets

ระบบจะสร้าง Header ดังนี้:

| วันที่และเวลา | User ID | รายการ | จำนวน (บาท) | ประเภท | หมวดหมู่ | วันที่บันทึก |
|-------------|---------|--------|-------------|--------|----------|-----------|
| 4/7/2568 14:30:00 | user123* | กาแฟ | 50 | รายจ่าย | เครื่องดื่ม | 4/7/2568 |

**หมายเหตุ:** User ID จะแสดงเฉพาะ 8 ตัวท้ายเพื่อความเป็นส่วนตัว

## 🔧 การทำงานของระบบ

### อัตโนมัติ
- เมื่อ user บันทึกรายรับรายจ่ายผ่าน LINE Bot
- ระบบจะบันทึกข้อมูลลงใน Google Sheets ทันที
- หากเกิดข้อผิดพลาดกับ Google Sheets ระบบจะยังคงทำงานต่อไป

### Manual Testing
- ใช้ API endpoints สำหรับทดสอบ
- ตรวจสอบข้อมูลล่าสุดผ่าน API

## ⚠️ การแก้ไขปัญหา

### Service Account ไม่มีสิทธิ์
```
Error: The caller does not have permission
```
**แก้ไข:** ตรวจสอบว่าได้แชร์ Google Sheets ให้กับ Service Account แล้วหรือไม่

### ไฟล์ Key ไม่พบ
```
Google Service Account key file not found
```
**แก้ไข:** ตรวจสอบว่าไฟล์ `google-service-account.json` อยู่ในตำแหน่งที่ถูกต้อง

### API ไม่เปิดใช้งาน
```
Google Sheets API has not been used
```
**แก้ไข:** เปิดใช้งาน Google Sheets API ใน Google Cloud Console

## 🔒 ความปลอดภัย

- ไฟล์ Service Account Key ห้ามเก็บใน Git repository
- เพิ่ม `google-service-account.json` ใน `.gitignore`
- User ID จะถูกย่อให้เหลือ 8 ตัวท้ายเพื่อความเป็นส่วนตัว
- ใช้ HTTPS ในการเชื่อมต่อกับ Google Sheets API

## 📱 ตัวอย่างการใช้งาน

เมื่อ user พิมพ์ใน LINE:
```
User: กาแฟ 50 บาท
Bot: 💰 บันทึกเรียบร้อยแล้ว! 📝 กาแฟ: 50 บาท
```

ข้อมูลจะถูกบันทึกใน Google Sheets:
- วันที่และเวลา: 4/7/2568 14:30:00
- User ID: user123* (8 ตัวท้าย)
- รายการ: กาแฟ
- จำนวน: 50
- ประเภท: รายจ่าย
- หมวดหมู่: เครื่องดื่ม
- วันที่บันทึก: 4/7/2568