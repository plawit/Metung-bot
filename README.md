<<<<<<< HEAD
# มีตังค์ (MeeTung) LINE Chatbot

🐱 มีตังค์ - บอทแมวผู้ช่วยบันทึกรายรับรายจ่าย พร้อม AI Vector Search ด้วย Pinecone

## ฟีเจอร์หลัก

- 🐱 **มีตังค์** - บุคลิกแมวน่ารัก พูดจาเป็นกันเอง
- 💰 บันทึกและจำแนกรายรับรายจ่ายอัตโนมัติ
- 🧠 **AI Vector Search** - ค้นหาข้อมูลจากเอกสารด้วย Pinecone
- 📊 วิเคราะห์และจำแนกหมวดหมู่การเงินด้วย AI
- 💬 จำบริบทการสนทนา (10 ข้อความล่าสุดต่อผู้ใช้)
- 🎯 คำแนะนำการจัดการเงินจากเอกสารอ้างอิง
- 📈 **Google Sheets Integration** - บันทึกรายรับรายจ่ายลง Google Sheets อัตโนมัติ

## การติดตั้ง

1. Clone โปรเจค
2. ติดตั้ง dependencies:
   ```bash
   npm install
   ```

3. สร้างไฟล์ `.env` จาก `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. กรอกข้อมูล API Keys ใน `.env`:
   ```env
   # LINE Bot Configuration
   LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
   LINE_CHANNEL_SECRET=your_line_channel_secret
   
   # AI Services
   GEMINI_API_KEY=your_gemini_api_key
   
   # Pinecone Vector Database
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=finance-assistant
   
   # Server Configuration
   PORT=3000
   ```

## 🧠 Pinecone Vector Search Setup

### 1. สร้าง Pinecone Account
1. ไปที่ [Pinecone](https://app.pinecone.io)
2. สร้าง account และ project ใหม่
3. สร้าง index ชื่อ `finance-assistant` หรือชื่อที่ตั้งใน `.env`
4. ตั้งค่า dimension = **768** (สำหรับ Gemini embeddings)
5. เลือก metric = **cosine**

### 2. เตรียมเอกสาร
ใส่ไฟล์ `.txt` ในโฟลเดอร์ `document/`:
- `expense-categories.txt` - หมวดหมู่รายจ่าย
- `sample-finance-guide.txt` - คู่มือการเงิน  

หมายเหตุ: บุคลิกของมีตังค์ถูกกำหนดไว้ใน `services/aiMessageClassifier.js` แล้ว

### 3. อัพโหลดเอกสารขึ้น Pinecone
```bash
node update-pinecone.js
```

หรือผ่าน API:
```bash
curl -X POST http://localhost:3000/update-documents
```

## การใช้งาน

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🎮 API Endpoints

### Vector Search & Document Management
- `GET /vector-stats` - ดูสถิติ Pinecone index
- `POST /update-documents` - อัพเดตเอกสารใน Pinecone
- `GET /conversations` - ดูสรุปประวัติการสนทนาทุก user
- `GET /conversations/:userId` - ดูประวัติการสนทนาของ user เฉพาะ

### LINE Webhook
- `POST /webhook` - รับข้อความจาก LINE
- `GET /` - Health check

### Google Sheets Integration
- `GET /google-sheets/test` - ทดสอบการเชื่อมต่อ Google Sheets
- `GET /google-sheets/recent` - ดูข้อมูลล่าสุดใน Google Sheets
- `POST /google-sheets/test-record` - เพิ่มข้อมูลทดสอบ

### Testing & Debug
- `GET /test-pipecode` - ทดสอบการเชื่อมต่อ pipecode
- `GET /pipecode-status` - สถานะ pipecode service
- `POST /pipecode-send` - ส่งข้อมูลไป pipecode

## 🧪 Testing Commands

### 1. ทดสอบ Vector Search
```bash
# ทดสอบการค้นหาแบบ interactive
node interactive-search.js

# ทดสอบการค้นหาข้อมูล metung-bot
node test-metung-search.js

# ทดสอบการค้นหาแบบ mock (ไม่ต้องใช้ Pinecone)
node test-search-mock.js
```

### 2. ตรวจสอบสถานะ Pinecone
```bash
curl http://localhost:3000/vector-stats
```

### 3. ดูประวัติการสนทนา
```bash
# ดูสรุปทุก user
curl http://localhost:3000/conversations

# ดูประวัติของ user เฉพาะ
curl http://localhost:3000/conversations/U1234567890
```

### 4. อัพเดตเอกสารใน Pinecone
```bash
curl -X POST http://localhost:3000/update-documents
```

### 5. ทดสอบ Google Sheets Integration
```bash
# ทดสอบการเชื่อมต่อ
curl http://localhost:3000/google-sheets/test

# เพิ่มข้อมูลทดสอบ
curl -X POST http://localhost:3000/google-sheets/test-record

# ดูข้อมูลล่าสุด
curl http://localhost:3000/google-sheets/recent?limit=5

# อัพเดตเอกสารใน Pinecone
node test/update-pinecone.js
```

## 🐱 มีตังค์ Chat Examples

### การทักทาย
```
User: สวัสดี
Bot: สวัสดีจ้า~ 🐾 มีตังค์พร้อมช่วยบันทึกรายรับรายจ่ายแล้วน้า 💰
```

### บันทึกรายจ่าย
```
User: กาแฟ 50 บาท
Bot: พร้อมบันทึกแล้วน้า~ 🐱☕

User: เมื่อวานจ่ายค่าน้ำ 200 บาท  
Bot: บันทึกแล้วจ้า~ 🚰 รายจ่าย: ค่าน้ำ 200 บาท 🐱💦
```

### คำถามเกี่ยวกับการเงิน
```
User: การลงทุน
Bot: จะได้คำตอบจากข้อมูลใน Pinecone เกี่ยวกับการลงทุน

User: มีตังค์คืออะไร
Bot: จ้า~ มีตังค์เป็นแมวบอทผู้ช่วยด้านการเงินนะ 🐱💰
```

## 🏗️ System Architecture

### AI Services
- **Gemini 2.0 Flash** - ประมวลผลภาษาธรรมชาติและจำแนกหมวดหมู่
- **Pinecone** - Vector database สำหรับค้นหาเอกสารที่เกี่ยวข้อง
- **Text Embeddings** - แปลงข้อความเป็น vector ด้วย Gemini embeddings

### Core Components
- `AIMessageClassifier` - จำแนกประเภทข้อความและสร้างคำตอบ
- `AIClassifier` - จำแนกหมวดหมู่รายรับรายจ่าย
- `VectorService` - จัดการ Pinecone และการค้นหา
- `ConversationHistory` - เก็บประวัติสนทนา 10 ข้อความล่าสุดต่อผู้ใช้

## 🔧 Troubleshooting

### Pinecone Connection Issues
```bash
# ตรวจสอบ API Key
echo $PINECONE_API_KEY

# ทดสอบการเชื่อมต่อ
node update-pinecone.js
```

### Vector Search ไม่ทำงาน
```bash
# ตรวจสอบ index stats
curl http://localhost:3000/vector-stats

# ทดสอบการค้นหาแบบ mock
node test-search-mock.js
```

### ประวัติการสนทนาหาย
```bash
# ดูประวัติที่มี
curl http://localhost:3000/conversations
```

## 📁 โครงสร้างโฟลเดอร์

```
├── README.md              # คู่มือหลัก
├── index.js               # ไฟล์หลักของ LINE Bot
├── .env.example           # ตัวอย่างการตั้งค่า environment
├── docs/                  # เอกสารและคู่มือ
│   ├── GOOGLE_SHEETS_SETUP.md
│   └── fix-google-api.md
├── keys/                  # ไฟล์ API keys (ไม่อัพโหลด git)
│   └── google-service-account.json
├── test/                  # ไฟล์ทดสอบและ utility scripts
│   ├── README.md          # คู่มือการใช้งาน test scripts
│   ├── interactive-search.js
│   ├── test-*.js
│   └── update-pinecone.js
├── services/              # บริการหลักของระบบ
├── prompts/               # AI prompts
└── document/              # เอกสารสำหรับ vector search
```

## 📝 Development Notes

### เพิ่มเอกสารใหม่
1. ใส่ไฟล์ `.txt` ในโฟลเดอร์ `document/`
2. รัน `node test/update-pinecone.js`
3. ทดสอบการค้นหาด้วย `node test/interactive-search.js`

### แก้ไขบุคลิกของมีตังค์
แก้ไขไฟล์ `services/aiMessageClassifier.js` ในส่วน prompt ที่กำหนดบทบาทและลีลาการพูด

### เพิ่มหมวดหมู่ใหม่
แก้ไขไฟล์ `services/aiClassifier.js` ในส่วน prompt

## 🚀 Deployment

### LINE Webhook URL
ตั้งค่า Webhook URL ใน LINE Developer Console:
```
https://yourdomain.com/webhook
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
PINECONE_API_KEY=your_production_pinecone_key
GEMINI_API_KEY=your_production_gemini_key
LINE_CHANNEL_ACCESS_TOKEN=your_production_line_token
LINE_CHANNEL_SECRET=your_production_line_secret
```

## 📚 Dependencies

```json
{
  "@pinecone-database/pinecone": "^6.1.1",
  "@google/generative-ai": "^0.24.1", 
  "@line/bot-sdk": "^9.3.0",
  "express": "^4.21.1",
  "dotenv": "^16.4.7"
}
```

---

Made with 🐱 by มีตังค์ Team
=======
# Metung-bot
>>>>>>> afdf482b2cabd64fa964c72989c3871f18811056
