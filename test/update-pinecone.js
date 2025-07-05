// Script สำหรับอัพเดต Pinecone ให้รวมไฟล์ metung-bot.txt
require('dotenv').config();
const VectorService = require('./services/vectorService');

async function updatePinecone() {
  try {
    console.log('🔄 เริ่มอัพเดต Pinecone...');
    
    // Initialize vector service
    const vectorService = new VectorService();
    await vectorService.initialize();
    console.log('✅ เชื่อมต่อ Pinecone สำเร็จ');
    
    // Get current index stats
    console.log('\n📊 สถิติก่อนอัพเดต:');
    const statsBefore = await vectorService.getIndexStats();
    console.log(statsBefore);
    
    // Update documents (includes metung-bot.txt)
    console.log('\n🔄 กำลังอัพเดตเอกสาร...');
    await vectorService.updateDocuments();
    console.log('✅ อัพเดตเอกสารสำเร็จ');
    
    // Wait a bit for index to update
    console.log('\n⏳ รอ index อัพเดต...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get updated stats
    console.log('\n📊 สถิติหลังอัพเดต:');
    const statsAfter = await vectorService.getIndexStats();
    console.log(statsAfter);
    
    // Test search with metung-bot related terms
    console.log('\n🔍 ทดสอบการค้นหาเกี่ยวกับ metung-bot...');
    
    const testQueries = [
      'มีตังค์',
      'แมวผู้ช่วย',
      'บอทแมว',
      'ภาษาเป็นมิตร',
      'เพิ่มอิโมจิ'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 ค้นหา: "${query}"`);
      const results = await vectorService.searchSimilarContent(query, 2);
      
      if (results.length > 0) {
        console.log(`   ✅ พบ ${results.length} ผลลัพธ์`);
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. Score: ${result.score.toFixed(4)} | ${result.filename}`);
          console.log(`      📝 ${result.content.substring(0, 80)}...`);
        });
      } else {
        console.log('   ❌ ไม่พบผลลัพธ์');
      }
    }
    
    console.log('\n🎉 อัพเดต Pinecone สำเร็จ!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// Run the update
updatePinecone().then(() => {
  console.log('\n✅ การอัพเดตเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ การอัพเดตล้มเหลว:', error);
  process.exit(1);
});