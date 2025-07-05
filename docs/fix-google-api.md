# 🔧 แก้ไข Google Sheets API Error

## Error ที่เจอ:
```
Method doesn't allow unregistered callers (callers without established identity). Please use API Key or other form of API consumer identity to call this API.
```

## วิธีแก้ไข:

### 1. ไปที่ Google Cloud Console
👉 **https://console.cloud.google.com/**

### 2. เลือก Project ที่ถูกต้อง
- คลิกที่ dropdown "Select a project" 
- เลือก **"masterclass-463005"**

### 3. เปิดใช้งาน Google Sheets API
- ไปที่ **"APIs & Services"** > **"Library"**
- ค้นหา **"Google Sheets API"**
- คลิกที่ **"Google Sheets API"**
- กดปุ่ม **"ENABLE"** (หากยังไม่ได้เปิด)

### 4. ตรวจสอบ Service Account
- ไปที่ **"APIs & Services"** > **"Credentials"**
- ตรวจสอบว่าเห็น Service Account: **metung-money-bot@masterclass-463005.iam.gserviceaccount.com**

### 5. เพิ่ม API Key (ถ้าจำเป็น)
- ในหน้า **"Credentials"**
- กดปุ่ม **"+ CREATE CREDENTIALS"** > **"API key"**
- คัดลอก API Key ที่ได้

### 6. จำกัดการใช้งาน API Key
- กดที่ API Key ที่สร้าง
- ใน **"API restrictions"** เลือก **"Restrict key"**
- เลือกเฉพาะ **"Google Sheets API"**
- กด **"Save"**