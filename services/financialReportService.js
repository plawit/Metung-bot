// Financial Report Service - จัดการข้อมูลการเงินเพื่อสร้างรายงาน
class FinancialReportService {
  
  // ดึงข้อมูลจาก Supabase สำหรับ user เฉพาะ
  static async getDataFromSupabase(supabaseService, userId = null) {
    try {
      if (!supabaseService || !supabaseService.supabase) {
        console.warn('Supabase service not available');
        return [];
      }

      // ดึงข้อมูลจาก Supabase และ filter ตาม userId
      const supabaseData = await Promise.race([
        supabaseService.getRecentRecords(100, userId), // เพิ่ม userId parameter
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase timeout')), 5000)
        )
      ]);
      
      if (supabaseData.error) {
        console.warn('Error fetching from Supabase:', supabaseData.error);
        return [];
      }

      // แปลงข้อมูลจาก Supabase format เป็น format ที่ใช้ในระบบ
      const formattedData = supabaseData.records?.filter(record => 
        record.refId && record.refId !== 'refId' // ข้าม header row
      ).map(record => ({
        refId: record.refId,
        รายการ: record.รายการ,
        จำนวน: parseFloat(record.จำนวน || 0),
        ประเภท: record.ประเภท,
        หมวดหมู่: record.หมวดรายการ,
        ลงวันที่: this.extractDateFromTimestamp(record.ลงวันที่), // แปลงเป็นรูปแบบวันที่ไทย
        timestamp: record.ลงวันที่
      })) || [];

      console.log(`Fetched ${formattedData.length} records from Supabase for user: ${userId ? userId.substring(userId.length - 8) : 'all'}`);
      console.log('Sample formatted data:', formattedData.slice(0, 2));
      return formattedData;
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      return [];
    }
  }
  
  // แปลง timestamp เป็นวันที่ไทย
  static extractDateFromTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
      // ถ้าเป็นรูปแบบ ISO (2025-07-05T09:40:57.043+00:00) แปลงเป็นรูปแบบไทย
      if (timestamp.includes('T')) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('th-TH');
      }
      
      // ถ้าเป็นรูปแบบ "4/7/2568 12:37:04" แยกเอาเฉพาะวันที่
      if (timestamp.includes(' ')) {
        return timestamp.split(' ')[0];
      }
      return timestamp;
    } catch (error) {
      console.error('Error extracting date:', error);
      return '';
    }
  }
  
  // คำนวณสรุปรายวัน
  static async calculateDailySummary(financeData, targetDate = null, supabaseService = null, userId = null) {
    // ใช้ข้อมูลจาก Supabase เป็นหลัก, local data เป็นรอง
    let allData = [];
    if (supabaseService) {
      console.log('📊 [DAILY] Fetching data from Supabase for userId:', userId);
      const supabaseData = await this.getDataFromSupabase(supabaseService, userId);
      allData = supabaseData;
      console.log('📊 [DAILY] Got', allData.length, 'records from Supabase');
    } else {
      // Filter local data by userId if provided
      allData = financeData || [];
      if (userId && allData.length > 0) {
        allData = allData.filter(item => item.userId === userId);
      }
    }
    const today = targetDate || new Date().toLocaleDateString('th-TH');
    
    const todayTransactions = allData.filter(item => 
      item.ลงวันที่ === today || item.ลงวันที่ === targetDate
    );
    
    const income = todayTransactions
      .filter(item => item.ประเภท === 'รายรับ')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const expense = todayTransactions
      .filter(item => item.ประเภท === 'รายจ่าย')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const balance = income - expense;
    
    return {
      date: today,
      income,
      expense,
      balance,
      transactions: todayTransactions.length,
      transactionList: todayTransactions.sort((a, b) => 
        new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now())
      )
    };
  }
  
  // คำนวณสรุปรายเดือน
  static async calculateMonthlySummary(financeData, month = null, year = null, supabaseService = null, userId = null) {
    // ใช้ข้อมูลจาก Supabase เป็นหลัก, local data เป็นรอง
    let allData = [];
    if (supabaseService) {
      const supabaseData = await this.getDataFromSupabase(supabaseService, userId);
      allData = supabaseData;
    } else {
      // Filter local data by userId if provided
      allData = financeData || [];
      if (userId && allData.length > 0) {
        allData = allData.filter(item => item.userId === userId);
      }
    }
    
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || (currentDate.getFullYear() + 543); // Convert to Buddhist year
    
    const monthlyTransactions = allData.filter(item => {
      if (!item.ลงวันที่) return false;
      const dateParts = item.ลงวันที่.split('/');
      if (dateParts.length !== 3) return false;
      
      const itemMonth = parseInt(dateParts[1]);
      const itemYear = parseInt(dateParts[2]);
      
      return itemMonth === targetMonth && itemYear === targetYear;
    });
    
    const income = monthlyTransactions
      .filter(item => item.ประเภท === 'รายรับ')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const expense = monthlyTransactions
      .filter(item => item.ประเภท === 'รายจ่าย')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const balance = income - expense;
    
    // คำนวณหมวดหมู่ที่ใช้จ่ายมากที่สุด
    const categoryExpenses = {};
    monthlyTransactions
      .filter(item => item.ประเภท === 'รายจ่าย')
      .forEach(item => {
        const category = item.หมวดหมู่ || 'อื่นๆ';
        categoryExpenses[category] = (categoryExpenses[category] || 0) + (item.จำนวน || 0);
      });
    
    const topCategories = Object.entries(categoryExpenses)
      .map(([หมวดหมู่, จำนวน]) => ({ หมวดหมู่, จำนวน }))
      .sort((a, b) => b.จำนวน - a.จำนวน);
    
    return {
      month: targetMonth,
      year: targetYear,
      income,
      expense,
      balance,
      topCategories,
      totalTransactions: monthlyTransactions.length,
      transactionList: monthlyTransactions
    };
  }
  
  // คำนวณยอดคงเหลือและสถิติ
  static async calculateBalanceReport(financeData, supabaseService = null, userId = null) {
    // ใช้ข้อมูลจาก Supabase เป็นหลัก, local data เป็นรอง
    let allData = [];
    if (supabaseService) {
      const supabaseData = await this.getDataFromSupabase(supabaseService, userId);
      allData = supabaseData;
    } else {
      // Filter local data by userId if provided
      allData = financeData || [];
      if (userId && allData.length > 0) {
        allData = allData.filter(item => item.userId === userId);
      }
    }
    
    const totalIncome = allData
      .filter(item => item.ประเภท === 'รายรับ')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const totalExpense = allData
      .filter(item => item.ประเภท === 'รายจ่าย')
      .reduce((sum, item) => sum + (item.จำนวน || 0), 0);
    
    const currentBalance = totalIncome - totalExpense;
    
    // คำนวณค่าเฉลี่ยรายเดือน (ใช้ข้อมูล 3 เดือนล่าสุด)
    const monthlyData = this.getMonthlyBreakdown(allData, 3);
    const monthlyAverage = monthlyData.length > 0 
      ? monthlyData.reduce((sum, month) => sum + month.balance, 0) / monthlyData.length
      : 0;
    
    // คำนวณอัตราการออม
    const savingsRate = totalIncome > 0 ? Math.round((currentBalance / totalIncome) * 100) : 0;
    
    // หาหมวดหมู่ที่ใช้จ่ายมากที่สุด
    const categoryExpenses = {};
    allData
      .filter(item => item.ประเภท === 'รายจ่าย')
      .forEach(item => {
        const category = item.หมวดหมู่ || 'อื่นๆ';
        categoryExpenses[category] = (categoryExpenses[category] || 0) + (item.จำนวน || 0);
      });
    
    const topExpenseCategory = Object.entries(categoryExpenses)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'ไม่มีข้อมูล';
    
    return {
      currentBalance,
      monthlyAverage: Math.round(monthlyAverage),
      savingsRate,
      topExpenseCategory,
      totalIncome,
      totalExpense,
      totalTransactions: allData.length
    };
  }
  
  // แยกข้อมูลรายเดือน
  static getMonthlyBreakdown(financeData, monthsCount = 12) {
    const monthlyData = {};
    
    financeData.forEach(item => {
      if (!item.ลงวันที่) return;
      
      const dateParts = item.ลงวันที่.split('/');
      if (dateParts.length !== 3) return;
      
      const monthKey = `${dateParts[1]}/${dateParts[2]}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: parseInt(dateParts[1]),
          year: parseInt(dateParts[2]),
          income: 0,
          expense: 0,
          balance: 0,
          transactions: 0
        };
      }
      
      const amount = item.จำนวน || 0;
      if (item.ประเภท === 'รายรับ') {
        monthlyData[monthKey].income += amount;
      } else if (item.ประเภท === 'รายจ่าย') {
        monthlyData[monthKey].expense += amount;
      }
      
      monthlyData[monthKey].balance = monthlyData[monthKey].income - monthlyData[monthKey].expense;
      monthlyData[monthKey].transactions++;
    });
    
    // แปลงเป็น array และเรียงลำดับตามเวลา
    return Object.values(monthlyData)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .slice(0, monthsCount);
  }
  
  // ค้นหารายการด้วย refId
  static findTransactionByRefId(financeData, refId) {
    return financeData.find(item => item.refId === refId || item.refId === refId.toString());
  }
  
  // ค้นหารายการด้วยคำค้นหา
  static searchTransactions(financeData, searchTerm, limit = 20) {
    const term = searchTerm.toLowerCase();
    
    return financeData
      .filter(item => 
        (item.รายการ && item.รายการ.toLowerCase().includes(term)) ||
        (item.หมวดหมู่ && item.หมวดหมู่.toLowerCase().includes(term)) ||
        (item.refId && item.refId.toString().includes(term))
      )
      .sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()))
      .slice(0, limit);
  }
  
  // รายการล่าสุด
  static getRecentTransactions(financeData, limit = 10, userId = null) {
    let filteredData = financeData || [];
    
    // Filter by userId if provided
    if (userId && filteredData.length > 0) {
      filteredData = filteredData.filter(item => item.userId === userId);
    }
    
    return filteredData
      .sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()))
      .slice(0, limit);
  }
  
  // ตรวจสอบว่าเป็นคำถามเกี่ยวกับรายงานการเงินหรือไม่
  static isFinancialReportQuery(message) {
    const reportKeywords = [
      'สรุป', 'รายงาน', 'ยอดคงเหลือ', 'ยอดรวม', 'รายรับ', 'รายจ่าย',
      'ประวัติ', 'รายการ', 'เดือนนี้', 'วันนี้', 'รายการล่าสุด',
      'refid', 'ref id', 'รหัสอ้างอิง', 'ค้นหา', 'แก้ไข'
    ];
    
    const lowerMessage = message.toLowerCase();
    return reportKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  // แยกประเภทคำถามรายงาน
  static classifyReportQuery(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('วันนี้') && (lowerMessage.includes('สรุป') || lowerMessage.includes('รายงาน'))) {
      return 'daily_summary';
    }
    
    if (lowerMessage.includes('วันนี้') && lowerMessage.includes('รายการ')) {
      return 'daily_transactions';
    }
    
    if (lowerMessage.includes('เดือนนี้') && (lowerMessage.includes('สรุป') || lowerMessage.includes('รายงาน'))) {
      return 'monthly_summary';
    }
    
    if (lowerMessage.includes('ยอดคงเหลือ') || lowerMessage.includes('ยอดรวม')) {
      return 'balance_report';
    }
    
    if (lowerMessage.includes('รายการล่าสุด')) {
      return 'recent_transactions';
    }
    
    if (lowerMessage.includes('รายงาน') || lowerMessage.includes('เมนู')) {
      return 'report_menu';
    }
    
    return 'general_report';
  }
}

module.exports = FinancialReportService;