const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = '1lKigYFWiZ5n5_JHV1KLJi93tPJcCVbl26k59nVu6_fw';
    this.sheetName = 'บันทึกรายการรายรับรายจ่าย'; // หรือชื่อ sheet ที่ต้องการ
  }

  // Initialize Google Sheets API
  async initialize() {
    try {
      // Check if service account key file exists
      const keyFilePath = path.join(__dirname, '..', 'keys', 'google-service-account.json');
      
      if (!fs.existsSync(keyFilePath)) {
        console.log('Google Service Account key file not found. Google Sheets integration disabled.');
        return false;
      }

      // Load service account credentials
      const credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
      
      // Debug: Check if private key starts and ends correctly
      console.log('Private key starts with:', credentials.private_key.substring(0, 30));
      console.log('Private key ends with:', credentials.private_key.substring(credentials.private_key.length - 30));
      
      // Create JWT auth using the key file path directly
      this.auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      // Initialize sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('Google Sheets service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      return false;
    }
  }

  // Add finance record to Google Sheets
  async addFinanceRecord(userId, financeData) {
    try {
      if (!this.sheets) {
        console.log('Google Sheets not initialized. Skipping record.');
        return false;
      }

      // Get next sequential refId
      const refId = await this.getNextRefId();

      // Prepare data for Google Sheets
      const timestamp = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok'
      });
      
      // Extract user ID last 8 characters for privacy
      const userIdShort = userId.substring(userId.length - 8);
      
      const rowData = [
        refId,                       // RefID (column A)
        timestamp,                   // วันที่และเวลา
        userIdShort,                 // User ID (8 ตัวท้าย)
        financeData.รายการ || '',    // รายการ
        financeData.หมวดหมู่ || '',   // หมวดหมู่ (สลับเป็น column E)
        financeData.จำนวน || 0,      // จำนวน (สลับเป็น column F)
        financeData.ประเภท || '',    // ประเภท (รายรับ/รายจ่าย)
        financeData.ลงวันที่ || ''    // วันที่บันทึก
      ];

      // Add row to spreadsheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      });

      console.log(`✅ Added finance record to Google Sheets: ${financeData.รายการ} ${financeData.จำนวน} บาท (RefID: ${refId})`);
      return { success: true, refId };
    } catch (error) {
      console.error('Error adding finance record to Google Sheets:', error);
      return false;
    }
  }

  // Initialize spreadsheet with headers (run once)
  async initializeHeaders() {
    try {
      if (!this.sheets) {
        console.log('Google Sheets not initialized.');
        return false;
      }

      // Skip header initialization for now to avoid permission issues
      console.log('Skipping header initialization - will add headers when first record is added');
      return true;
    } catch (error) {
      console.error('Error initializing headers:', error);
      return false;
    }
  }

  // Get spreadsheet info
  async getSpreadsheetInfo() {
    try {
      if (!this.sheets) {
        return { error: 'Google Sheets not initialized' };
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      return { error: error.message };
    }
  }

  // Test connection
  async testConnection() {
    try {
      if (!this.sheets) {
        return { success: false, error: 'Google Sheets not initialized' };
      }

      // Simple test - try to add a test record instead of getting spreadsheet info
      const testResult = await this.addFinanceRecord('test-connection', {
        รายการ: 'Connection Test',
        จำนวน: 0,
        ประเภท: 'ทดสอบ',
        หมวดหมู่: 'ระบบ',
        ลงวันที่: new Date().toLocaleDateString('th-TH')
      });

      if (testResult && testResult.success) {
        return {
          success: true,
          message: 'Google Sheets connection successful - test record added',
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`,
          refId: testResult.refId
        };
      } else {
        return {
          success: false,
          error: 'Failed to add test record'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update existing record by refId
  async updateRecordByRefId(refId, updateData) {
    try {
      if (!this.sheets) {
        return { error: 'Google Sheets not initialized' };
      }

      // First, find the row with the refId
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:H`
      });

      const values = response.data.values || [];
      let rowIndex = -1;
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === refId) {
          rowIndex = i + 1; // Google Sheets uses 1-based indexing
          break;
        }
      }

      if (rowIndex === -1) {
        return { error: 'Record with refId not found' };
      }

      // Update the row
      const existingRow = values[rowIndex - 1];
      const updatedRow = [
        refId,                                    // RefID (keep same)
        existingRow[1],                          // Timestamp (keep same)
        existingRow[2],                          // User ID (keep same)
        updateData.รายการ || existingRow[3],      // รายการ
        updateData.หมวดหมู่ || existingRow[4],     // หมวดหมู่ (column E)
        updateData.จำนวน || existingRow[5],       // จำนวน (column F)
        updateData.ประเภท || existingRow[6],      // ประเภท (column G)
        updateData.ลงวันที่ || existingRow[7]     // วันที่บันทึก (column H)
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowIndex}:H${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [updatedRow]
        }
      });

      console.log(`✅ Updated finance record in Google Sheets: RefID ${refId}`);
      return { success: true, refId, updatedRow };
    } catch (error) {
      console.error('Error updating finance record in Google Sheets:', error);
      return { error: error.message };
    }
  }

  // Get record by refId
  async getRecordByRefId(refId) {
    try {
      if (!this.sheets) {
        return { error: 'Google Sheets not initialized' };
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:H`
      });

      const values = response.data.values || [];
      
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === refId) {
          const headers = ['RefID', 'วันที่และเวลา', 'User ID', 'รายการ', 'จำนวน', 'ประเภท', 'หมวดหมู่', 'ลงวันที่'];
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[i][index] || '';
          });
          return { success: true, record };
        }
      }

      return { error: 'Record with refId not found' };
    } catch (error) {
      console.error('Error getting record by refId:', error);
      return { error: error.message };
    }
  }

  // Get next sequential refId
  async getNextRefId() {
    try {
      if (!this.sheets) {
        return '1'; // fallback if sheets not initialized
      }

      // Get all existing refIds
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`
      });

      const values = response.data.values || [];
      
      // Find the highest numeric refId
      let maxRefId = 0;
      values.forEach(row => {
        if (row[0] && !isNaN(row[0])) {
          const numericId = parseInt(row[0]);
          if (numericId > maxRefId) {
            maxRefId = numericId;
          }
        }
      });

      return (maxRefId + 1).toString();
    } catch (error) {
      console.error('Error getting next refId:', error);
      // fallback to timestamp-based if there's an error
      return Date.now().toString().slice(-6);
    }
  }

  // Get recent records for specific user
  async getRecentRecords(limit = 10, userId = null) {
    try {
      if (!this.sheets) {
        return { error: 'Google Sheets not initialized' };
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:H`
      });

      const values = response.data.values || [];
      if (values.length === 0) {
        return { records: [], count: 0 };
      }

      // Define headers according to our column structure
      const headers = ['refId', 'ลงวันที่', 'userId', 'รายการ', 'หมวดรายการ', 'จำนวน', 'ประเภท', 'วันที่บันทึก'];
      let records = values.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });

      // Filter by userId if provided
      if (userId) {
        const userIdShort = userId.substring(userId.length - 8);
        records = records.filter(record => record.userId === userIdShort);
      }

      // Get latest records
      records = records.slice(-limit);

      return { records, count: records.length };
    } catch (error) {
      console.error('Error getting recent records:', error);
      return { error: error.message };
    }
  }
}

module.exports = GoogleSheetsService;