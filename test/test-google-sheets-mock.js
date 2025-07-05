// Mock test for Google Sheets integration without real credentials
const express = require('express');

// Simulate Google Sheets data storage
let mockSheetsData = [
  ['วันที่และเวลา', 'User ID', 'รายการ', 'จำนวน (บาท)', 'ประเภท', 'หมวดหมู่', 'วันที่บันทึก']
];

class MockGoogleSheetsService {
  constructor() {
    this.initialized = true;
    this.spreadsheetId = '1lKigYFWiZ5n5_JHV1KLJi93tPJcCVbl26k59nVu6_fw';
  }

  async initialize() {
    console.log('📊 Mock Google Sheets service initialized');
    return true;
  }

  async addFinanceRecord(userId, financeData) {
    try {
      const timestamp = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok'
      });
      
      const userIdShort = userId.substring(userId.length - 8);
      
      const rowData = [
        timestamp,
        userIdShort,
        financeData.รายการ || '',
        financeData.จำนวน || 0,
        financeData.ประเภท || '',
        financeData.หมวดหมู่ || '',
        financeData.ลงวันที่ || ''
      ];

      mockSheetsData.push(rowData);
      
      console.log(`✅ Mock: Added to Google Sheets - ${financeData.รายการ} ${financeData.จำนวน} บาท`);
      return true;
    } catch (error) {
      console.error('Mock Google Sheets error:', error);
      return false;
    }
  }

  async testConnection() {
    return {
      success: true,
      message: 'Mock Google Sheets connection successful',
      spreadsheet: {
        title: 'มีตังค์ Finance Records (Mock)',
        url: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`,
        records: mockSheetsData.length - 1 // -1 for headers
      }
    };
  }

  async getRecentRecords(limit = 10) {
    try {
      if (mockSheetsData.length <= 1) {
        return { records: [], count: 0 };
      }

      const headers = mockSheetsData[0];
      const dataRows = mockSheetsData.slice(1);
      const recentRows = dataRows.slice(-limit);

      const records = recentRows.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });

      return { 
        records, 
        count: dataRows.length,
        note: 'This is mock data for testing purposes'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  printMockData() {
    console.log('\n📊 Mock Google Sheets Data:');
    console.log('='.repeat(80));
    
    if (mockSheetsData.length <= 1) {
      console.log('ไม่มีข้อมูล (เฉพาะ headers)');
      return;
    }

    // Print headers
    const headers = mockSheetsData[0];
    console.log(headers.join(' | '));
    console.log('-'.repeat(80));

    // Print data rows
    const dataRows = mockSheetsData.slice(1);
    dataRows.forEach(row => {
      console.log(row.join(' | '));
    });
    
    console.log('='.repeat(80));
    console.log(`📈 รวม ${dataRows.length} รายการ`);
  }
}

// Test the mock service
async function testMockGoogleSheets() {
  const mockService = new MockGoogleSheetsService();
  
  console.log('🧪 Testing Mock Google Sheets Service');
  console.log('');

  // Initialize
  await mockService.initialize();

  // Test connection
  console.log('1. Testing connection...');
  const connectionTest = await mockService.testConnection();
  console.log('   Result:', connectionTest);
  console.log('');

  // Add some test data
  console.log('2. Adding test finance records...');
  
  const testRecords = [
    {
      รายการ: 'กาแฟ',
      จำนวน: 50,
      ประเภท: 'รายจ่าย',
      หมวดหมู่: 'เครื่องดื่ม',
      ลงวันที่: new Date().toLocaleDateString('th-TH')
    },
    {
      รายการ: 'เงินเดือน',
      จำนวน: 30000,
      ประเภท: 'รายรับ',
      หมวดหมู่: 'งาน',
      ลงวันที่: new Date().toLocaleDateString('th-TH')
    },
    {
      รายการ: 'ค่าข้าว',
      จำนวน: 120,
      ประเภท: 'รายจ่าย',
      หมวดหมู่: 'อาหาร',
      ลงวันที่: new Date().toLocaleDateString('th-TH')
    }
  ];

  for (let i = 0; i < testRecords.length; i++) {
    const record = testRecords[i];
    const userId = `testuser${i + 1}_` + Math.random().toString(36).substr(2, 9);
    await mockService.addFinanceRecord(userId, record);
  }

  console.log('');

  // Get recent records
  console.log('3. Getting recent records...');
  const recentRecords = await mockService.getRecentRecords(5);
  console.log('   Recent records:', recentRecords.count, 'รายการ');
  console.log('');

  // Print all data
  mockService.printMockData();

  console.log('');
  console.log('✨ Mock test completed!');
  console.log('');
  console.log('📝 สิ่งที่จะเกิดขึ้นเมื่อมี Google Service Account:');
  console.log('   - ข้อมูลจะถูกบันทึกใน Google Sheets จริง');
  console.log('   - User สามารถเห็นข้อมูลใน: https://docs.google.com/spreadsheets/d/1lKigYFWiZ5n5_JHV1KLJi93tPJcCVbl26k59nVu6_fw/edit');
  console.log('   - ข้อมูลจะถาวรและสามารถแชร์กับผู้อื่นได้');
  console.log('');
  console.log('🔧 ในตอนนี้ระบบ LINE Bot จะ:');
  console.log('   - ยังคงบันทึกข้อมูลในหน่วยความจำ (financeData array)');
  console.log('   - พยายามส่งไป Google Sheets แต่จะ skip หากไม่มี credentials');
  console.log('   - ทำงานต่อไปได้ปกติแม้ Google Sheets ไม่พร้อมใช้งาน');
}

// Run the test
testMockGoogleSheets().catch(console.error);