// Export finance data to CSV as alternative to Google Sheets
const fs = require('fs');

// Function to export conversation data to CSV
async function exportFinanceDataToCSV() {
  try {
    // Get current conversation data
    const response = await fetch('http://localhost:3000/conversations');
    const data = await response.json();
    
    if (!data.success || !data.users) {
      console.log('ไม่มีข้อมูลในระบบ');
      return;
    }

    // Extract finance records from conversations
    const financeRecords = [];
    
    data.users.forEach(user => {
      const userId = user.userId;
      const userIdShort = userId.substring(userId.length - 8);
      
      // Look for confirmation messages that contain finance data
      const conversations = user.conversationHistory || [];
      
      conversations.forEach(msg => {
        if (msg.role === 'assistant' && msg.message.includes('💰 บันทึกเรียบร้อยแล้ว!')) {
          try {
            // Parse the confirmation message
            const lines = msg.message.split('\n');
            let item = '', amount = '', category = '', date = '';
            
            lines.forEach(line => {
              if (line.includes('📝')) {
                const match = line.match(/📝 (.+): ([\d,]+) บาท/);
                if (match) {
                  item = match[1];
                  amount = match[2].replace(/,/g, '');
                }
              }
              if (line.includes('📅')) {
                const dateMatch = line.match(/📅 วันที่: (.+)/);
                if (dateMatch) date = dateMatch[1];
              }
              if (line.includes('📂')) {
                const catMatch = line.match(/📂 หมวด: (.+)/);
                if (catMatch) category = catMatch[1];
              }
            });
            
            if (item && amount) {
              financeRecords.push({
                timestamp: msg.timestamp,
                userIdShort: userIdShort,
                item: item,
                amount: parseInt(amount),
                type: 'รายจ่าย', // assume expense for now
                category: category,
                date: date
              });
            }
          } catch (parseError) {
            console.log('Cannot parse message:', msg.message);
          }
        }
      });
    });

    if (financeRecords.length === 0) {
      console.log('ไม่พบรายการรายรับรายจ่าย');
      return;
    }

    // Create CSV content
    const headers = ['วันที่และเวลา', 'User ID', 'รายการ', 'จำนวน (บาท)', 'ประเภท', 'หมวดหมู่', 'วันที่บันทึก'];
    let csvContent = headers.join(',') + '\n';
    
    financeRecords.forEach(record => {
      const row = [
        new Date(record.timestamp).toLocaleString('th-TH'),
        record.userIdShort,
        `"${record.item}"`,
        record.amount,
        record.type,
        `"${record.category}"`,
        record.date
      ];
      csvContent += row.join(',') + '\n';
    });

    // Write to file
    const filename = `finance-data-${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`✅ ส่งออกข้อมูลเสร็จ: ${filename}`);
    console.log(`📊 รวม ${financeRecords.length} รายการ`);
    console.log('');
    console.log('📋 ตัวอย่างข้อมูล:');
    console.log(headers.join(' | '));
    console.log('-'.repeat(80));
    
    financeRecords.slice(0, 5).forEach(record => {
      const row = [
        new Date(record.timestamp).toLocaleString('th-TH'),
        record.userIdShort,
        record.item,
        record.amount,
        record.type,
        record.category,
        record.date
      ];
      console.log(row.join(' | '));
    });

    if (financeRecords.length > 5) {
      console.log(`... และอีก ${financeRecords.length - 5} รายการ`);
    }
    
    console.log('');
    console.log('📁 คุณสามารถนำไฟล์ CSV ไปอัพโหลดใน Google Sheets ได้');
    console.log('   หรือเปิดด้วย Excel/Numbers');

  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

// Run export
exportFinanceDataToCSV();