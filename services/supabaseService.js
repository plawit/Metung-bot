const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.tableName = 'finance_records';
  }

  // Initialize Supabase client
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.log('Supabase URL or Key not found in environment variables. Supabase integration disabled.');
        return false;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log('Supabase service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase service:', error);
      return false;
    }
  }

  // Add finance record to Supabase
  async addFinanceRecord(userId, financeData) {
    try {
      if (!this.supabase) {
        console.log('Supabase not initialized. Skipping record.');
        return false;
      }

      // Get next sequential refId
      const refId = await this.getNextRefId();

      // Prepare data for Supabase
      const timestamp = new Date().toISOString();
      
      // Extract user ID last 8 characters for privacy
      const userIdShort = userId.substring(userId.length - 8);
      
      const recordData = {
        ref_id: refId,
        created_at: timestamp,
        user_id: userIdShort,
        item_name: financeData.รายการ || '',
        category: financeData.หมวดหมู่ || '',
        amount: financeData.จำนวน || 0,
        type: financeData.ประเภท || '',
        record_date: financeData.ลงวันที่ || ''
      };

      // Insert record into Supabase
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([recordData])
        .select();

      if (error) {
        console.error('Error adding finance record to Supabase:', error);
        return false;
      }

      console.log(`✅ Added finance record to Supabase: ${financeData.รายการ} ${financeData.จำนวน} บาท (RefID: ${refId})`);
      return { success: true, refId, data: data[0] };
    } catch (error) {
      console.error('Error adding finance record to Supabase:', error);
      return false;
    }
  }

  // Test connection
  async testConnection() {
    try {
      if (!this.supabase) {
        return { success: false, error: 'Supabase not initialized' };
      }

      // Simple test - try to add a test record
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
          message: 'Supabase connection successful - test record added',
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
      if (!this.supabase) {
        return { error: 'Supabase not initialized' };
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          item_name: updateData.รายการ,
          category: updateData.หมวดหมู่,
          amount: updateData.จำนวน,
          type: updateData.ประเภท,
          record_date: updateData.ลงวันที่
        })
        .eq('ref_id', refId)
        .select();

      if (error) {
        console.error('Error updating record in Supabase:', error);
        return { error: error.message };
      }

      if (data.length === 0) {
        return { error: 'Record with refId not found' };
      }

      console.log(`✅ Updated finance record in Supabase: RefID ${refId}`);
      return { success: true, refId, data: data[0] };
    } catch (error) {
      console.error('Error updating finance record in Supabase:', error);
      return { error: error.message };
    }
  }

  // Get record by refId
  async getRecordByRefId(refId) {
    try {
      if (!this.supabase) {
        return { error: 'Supabase not initialized' };
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('ref_id', refId)
        .single();

      if (error) {
        console.error('Error getting record by refId:', error);
        return { error: error.message };
      }

      return { success: true, record: data };
    } catch (error) {
      console.error('Error getting record by refId:', error);
      return { error: error.message };
    }
  }

  // Get next sequential refId
  async getNextRefId() {
    try {
      if (!this.supabase) {
        return '1'; // fallback if supabase not initialized
      }

      // Get the highest ref_id
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('ref_id')
        .order('ref_id', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting next refId:', error);
        return Date.now().toString().slice(-6); // fallback to timestamp-based
      }

      if (data.length === 0) {
        return '1'; // First record
      }

      const lastRefId = parseInt(data[0].ref_id);
      return (lastRefId + 1).toString();
    } catch (error) {
      console.error('Error getting next refId:', error);
      return Date.now().toString().slice(-6); // fallback to timestamp-based
    }
  }

  // Get recent records for specific user
  async getRecentRecords(limit = 10, userId = null) {
    try {
      if (!this.supabase) {
        return { error: 'Supabase not initialized' };
      }

      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by userId if provided
      if (userId) {
        const userIdShort = userId.substring(userId.length - 8);
        query = query.eq('user_id', userIdShort);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting recent records:', error);
        return { error: error.message };
      }

      return { 
        records: data.map(record => ({
          refId: record.ref_id,
          ลงวันที่: record.created_at,
          userId: record.user_id,
          รายการ: record.item_name,
          หมวดรายการ: record.category,
          จำนวน: record.amount,
          ประเภท: record.type,
          วันที่บันทึก: record.record_date
        })), 
        count: data.length 
      };
    } catch (error) {
      console.error('Error getting recent records:', error);
      return { error: error.message };
    }
  }

  // Create table if it doesn't exist
  async createTable() {
    try {
      if (!this.supabase) {
        return { error: 'Supabase not initialized' };
      }

      // Try to create the table by attempting to insert a dummy record
      // This will automatically create the table if it doesn't exist
      console.log('Creating table by attempting to insert dummy record...');
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist, provide SQL to create it
        const createTableSQL = `
-- Run this SQL in your Supabase SQL Editor:
CREATE TABLE finance_records (
  id SERIAL PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL,
  item_name TEXT,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT,
  record_date TEXT
);

CREATE INDEX idx_finance_records_ref_id ON finance_records(ref_id);
CREATE INDEX idx_finance_records_user_id ON finance_records(user_id);
CREATE INDEX idx_finance_records_created_at ON finance_records(created_at);
        `;
        
        console.log(createTableSQL);
        return { error: 'Table does not exist. Please run the SQL above in Supabase SQL Editor.' };
      }

      console.log('✅ Table exists or was created successfully');
      return { success: true };
    } catch (error) {
      console.error('Error checking/creating table:', error);
      return { error: error.message };
    }
  }
}

module.exports = SupabaseService;