# 🧪 Test และ Utility Scripts

โฟลเดอร์นี้รวมไฟล์ทดสอบและ utility scripts ทั้งหมด

## 📋 ไฟล์ Test หลัก

### 🔍 Vector Search Testing
- **`interactive-search.js`** - ทดสอบการค้นหาแบบ interactive (ต้องมี Pinecone)
- **`test-search.js`** - ทดสอบการค้นหาแบบอัตโนมัติ
- **`test-search-mock.js`** - ทดสอบการค้นหาแบบ mock (ไม่ต้อง Pinecone)
- **`test-metung-search.js`** - ทดสอบการค้นหาข้อมูล metung-bot

### 📊 Google Sheets Testing
- **`test-google-sheets-mock.js`** - ทดสอบ Google Sheets แบบ mock
- **`setup-google-sheets.js`** - คู่มือการตั้งค่า Google Sheets

### 🗃️ Data Management
- **`add-test-data.js`** - เพิ่มข้อมูลทดสอบใน dashboard
- **`export-to-csv.js`** - ส่งออกข้อมูลเป็น CSV

## 🚀 วิธีใช้งาน

### ทดสอบ Vector Search
```bash
# แบบ interactive (ต้องมี Pinecone)
node test/interactive-search.js

# แบบ mock (ไม่ต้อง Pinecone)
node test/test-search-mock.js

# ทดสอบข้อมูล metung-bot
node test/test-metung-search.js
```

### ทดสอบ Google Sheets
```bash
# ทดสอบแบบ mock
node test/test-google-sheets-mock.js

# คู่มือการตั้งค่า
node test/setup-google-sheets.js
```

### จัดการข้อมูล
```bash
# เพิ่มข้อมูลทดสอบ
node test/add-test-data.js

# ส่งออกข้อมูลเป็น CSV
node test/export-to-csv.js
```

## 🔧 API Testing

### ทดสอบระบบผ่าน API
```bash
# ทดสอบ Google Sheets
curl http://localhost:3000/google-sheets/test

# เพิ่มข้อมูลทดสอบ
curl -X POST http://localhost:3000/google-sheets/test-record

# ดูข้อมูลล่าสุด
curl http://localhost:3000/google-sheets/recent?limit=5

# ดูสถิติ Pinecone
curl http://localhost:3000/vector-stats

# ดูประวัติการสนทนา
curl http://localhost:3000/conversations
```

## 📝 หมายเหตุ

- ไฟล์เหล่านี้เป็น utility scripts ไม่มีผลต่อการทำงานของ LINE Bot หลัก
- ใช้สำหรับการทดสอบและ debug เท่านั้น
- หากไม่ต้องการใช้ สามารถลบโฟลเดอร์ `test/` ได้เลย