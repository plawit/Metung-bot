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
  async addFinanceRecord(userId, financeData, retryCount = 0) {
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

      console.log('📝 Adding record to Supabase:', recordData);

      // Insert record into Supabase
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([recordData])
        .select();

      if (error) {
        console.error('Error adding finance record to Supabase:', error);
        
        // If duplicate key error, retry with new refId
        if (error.code === '23505' && retryCount < 3) {
          console.log(`🔄 Duplicate key error, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
          return this.addFinanceRecord(userId, financeData, retryCount + 1);
        }
        
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

  // Get next sequential refId with retry mechanism
  async getNextRefId(retryCount = 0) {
    try {
      if (!this.supabase) {
        return Date.now().toString(); // fallback if supabase not initialized
      }

      // Get all ref_ids and find the highest numeric value
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('ref_id');

      if (error) {
        console.error('Error getting next refId:', error);
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // unique fallback
      }

      let nextRefId;
      if (data.length === 0) {
        nextRefId = '1'; // First record
      } else {
        // Find the highest numeric ref_id
        const numericRefIds = data
          .map(row => parseInt(row.ref_id))
          .filter(id => !isNaN(id))
          .sort((a, b) => b - a);
        
        const lastRefId = numericRefIds.length > 0 ? numericRefIds[0] : 0;
        nextRefId = (lastRefId + 1).toString();
        
        console.log(`🔍 Found ${data.length} records, highest numeric ref_id: ${lastRefId}, next: ${nextRefId}`);
      }

      // Try to reserve this ref_id by attempting to insert a placeholder
      const { error: reserveError } = await this.supabase
        .from(this.tableName)
        .insert([{
          ref_id: nextRefId,
          created_at: new Date().toISOString(),
          user_id: 'temp_placeholder',
          item_name: 'PLACEHOLDER_RESERVED',
          category: 'SYSTEM',
          amount: 0,
          type: 'PLACEHOLDER',
          record_date: new Date().toLocaleDateString('th-TH')
        }]);

      if (reserveError) {
        if (reserveError.code === '23505' && retryCount < 3) {
          // Duplicate key, retry with next number
          console.log(`RefId ${nextRefId} already exists, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // exponential backoff
          return this.getNextRefId(retryCount + 1);
        } else {
          // Use timestamp-based fallback for uniqueness
          return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      }

      // Successfully reserved, now delete the placeholder
      await this.supabase
        .from(this.tableName)
        .delete()
        .eq('ref_id', nextRefId)
        .eq('item_name', 'PLACEHOLDER_RESERVED');

      return nextRefId;
    } catch (error) {
      console.error('Error getting next refId:', error);
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // unique fallback
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
        .select('ref_id, created_at, user_id, item_name, category, amount, type, record_date') // เลือกเฉพาะ columns ที่ต้องการ
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by userId if provided
      if (userId) {
        const userIdShort = userId.substring(userId.length - 8);
        console.log(`🔍 Filtering by userId: ${userId} -> ${userIdShort}`);
        query = query.eq('user_id', userIdShort);
      } else {
        console.log('🔍 No userId filter - showing all records');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting recent records:', error);
        return { error: error.message };
      }

      console.log(`🔍 Query returned ${data.length} records`);
      if (data.length > 0) {
        console.log('Sample records user_ids:', data.slice(0, 3).map(r => r.user_id));
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