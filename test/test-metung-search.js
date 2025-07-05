// Mock test สำหรับทดสอบการค้นหาข้อมูล metung-bot
const fs = require('fs');
const path = require('path');

// Mock vector search function
function mockVectorSearch(query, documents) {
  console.log(`🔍 ค้นหา: "${query}"`);
  
  const results = [];
  
  documents.forEach((doc, index) => {
    const content = doc.content.toLowerCase();
    const searchTerm = query.toLowerCase();
    
    if (content.includes(searchTerm)) {
      const matches = (content.match(new RegExp(searchTerm, 'g')) || []).length;
      const score = matches * 0.8 + (Math.random() * 0.2);
      
      results.push({
        filename: doc.filename,
        content: doc.content,
        score: score,
        chunk_index: index
      });
    }
  });
  
  return results.sort((a, b) => b.score - a.score);
}

// Load documents including metung-bot.txt
function loadDocuments() {
  const documentsPath = path.join(__dirname, 'document');
  const documents = [];
  
  try {
    const files = fs.readdirSync(documentsPath).filter(file => file.endsWith('.txt'));
    
    console.log('📄 เอกสารที่พบ:');
    files.forEach(file => console.log(`   • ${file}`));
    
    files.forEach(file => {
      const filePath = path.join(documentsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split into chunks
      const chunks = content.split('\n\n').filter(chunk => chunk.trim().length > 0);
      
      chunks.forEach((chunk, index) => {
        documents.push({
          filename: file,
          content: chunk.trim(),
          chunk_index: index
        });
      });
    });
    
    return documents;
  } catch (error) {
    console.error('❌ ไม่สามารถอ่านไฟล์เอกสาร:', error);
    return [];
  }
}

// Test metung-bot search
async function testMetungSearch() {
  console.log('🐱 ทดสอบการค้นหาข้อมูล metung-bot...');
  
  const documents = loadDocuments();
  console.log(`\n📚 โหลดเอกสารทั้งหมด: ${documents.length} chunks`);
  
  // Check if metung-bot.txt is included
  const metungChunks = documents.filter(doc => doc.filename === 'metung-bot.txt');
  console.log(`🐱 ข้อมูล metung-bot: ${metungChunks.length} chunks`);
  
  if (metungChunks.length > 0) {
    console.log('\n📄 เนื้อหาจาก metung-bot.txt:');
    metungChunks.forEach((chunk, index) => {
      console.log(`   Chunk ${index + 1}: ${chunk.content.substring(0, 100)}...`);
    });
  }
  
  // Test queries related to metung-bot
  const testQueries = [
    'มีตังค์',
    'แมวผู้ช่วย',
    'บอทแมว',
    'ภาษาเป็นมิตร',
    'อิโมจิ',
    'รายรับรายจ่าย',
    'บันทึก',
    'จัดหมวดหมู่'
  ];
  
  console.log('\n=== ทดสอบการค้นหาคำที่เกี่ยวข้องกับ metung-bot ===');
  
  testQueries.forEach(query => {
    const results = mockVectorSearch(query, documents);
    console.log(`\n🔍 "${query}": ${results.length} ผลลัพธ์`);
    
    if (results.length > 0) {
      results.slice(0, 2).forEach((result, index) => {
        console.log(`   ${index + 1}. Score: ${result.score.toFixed(4)} | ${result.filename}`);
        console.log(`      📝 ${result.content.substring(0, 80)}...`);
      });
    } else {
      console.log('   ❌ ไม่พบผลลัพธ์');
    }
  });
  
  // Show what would be the response for typical queries
  console.log('\n=== จำลองการตอบคำถามด้วยข้อมูล metung-bot ===');
  
  const sampleQueries = [
    'มีตังค์คืออะไร',
    'บอทนี้พูดยังไง',
    'ทำอะไรได้บ้าง'
  ];
  
  sampleQueries.forEach(query => {
    console.log(`\n❓ "${query}"`);
    const results = mockVectorSearch(query, documents);
    
    if (results.length > 0) {
      const topResult = results[0];
      console.log(`   🤖 ตอบได้จากข้อมูล: ${topResult.filename}`);
      console.log(`   📄 เนื้อหาอ้างอิง: ${topResult.content.substring(0, 150)}...`);
      
      // Mock AI response based on metung-bot.txt
      if (topResult.filename === 'metung-bot.txt') {
        console.log(`   💬 ตัวอย่างคำตอบ: "จ้า~ มีตังค์เป็นแมวบอทผู้ช่วยด้านการเงินนะ 🐱💰"`);
      }
    } else {
      console.log('   ❌ ไม่พบข้อมูลที่เกี่ยวข้อง');
    }
  });
  
  console.log('\n🎉 การทดสอบเสร็จสิ้น!');
}

// Run the test
testMetungSearch().catch(error => {
  console.error('❌ การทดสอบล้มเหลว:', error);
});