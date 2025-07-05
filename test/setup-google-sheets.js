// Quick setup script for Google Sheets integration
console.log('🔧 Google Sheets Integration Setup');
console.log('');

console.log('ขั้นตอนการตั้งค่า:');
console.log('');

console.log('1. 📋 สร้าง Google Cloud Project:');
console.log('   - ไปที่ https://console.cloud.google.com/');
console.log('   - สร้าง project ใหม่หรือเลือกที่มีอยู่');
console.log('   - เปิดใช้งาน Google Sheets API');
console.log('');

console.log('2. 🔑 สร้าง Service Account:');
console.log('   - ไปที่ IAM & Admin > Service Accounts');
console.log('   - สร้าง Service Account ใหม่');
console.log('   - ดาวน์โหลด JSON key file');
console.log('   - เปลี่ยนชื่อเป็น "google-service-account.json"');
console.log('   - วางไฟล์ในโฟลเดอร์โปรเจค');
console.log('');

console.log('3. 📊 แชร์ Google Sheets:');
console.log('   - เปิด: https://docs.google.com/spreadsheets/d/1lKigYFWiZ5n5_JHV1KLJi93tPJcCVbl26k59nVu6_fw/edit');
console.log('   - กด Share');
console.log('   - ใส่ email ของ Service Account (จากไฟล์ JSON)');
console.log('   - ตั้งสิทธิ์เป็น Editor');
console.log('   - กด Send');
console.log('');

console.log('4. 🧪 ทดสอบ:');
console.log('   - รีสตาร์ท server: npm start');
console.log('   - ทดสอบ: curl http://localhost:3000/google-sheets/test');
console.log('   - เพิ่มข้อมูลทดสอบ: curl -X POST http://localhost:3000/google-sheets/test-record');
console.log('');

console.log('📁 ตัวอย่างไฟล์ google-service-account.json:');
console.log('ดูได้ที่ไฟล์ google-service-account-example.json');
console.log('');

console.log('❓ หากต้องการความช่วยเหลือเพิ่มเติม:');
console.log('อ่านคู่มือใน GOOGLE_SHEETS_SETUP.md');