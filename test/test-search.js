// Test script สำหรับทดสอบการค้นหา Pinecone
const VectorService = require('./services/vectorService');

async function testSearch() {
  try {
    console.log('🔍 เริ่มทดสอบการค้นหา Pinecone...');
    
    // Initialize vector service
    const vectorService = new VectorService();
    await vectorService.initialize();
    console.log('✅ เชื่อมต่อ Pinecone สำเร็จ');
    
    // Process documents first
    console.log('📄 กำลังประมวลผลเอกสาร...');
    await vectorService.processDocuments();
    console.log('✅ ประมวลผลเอกสารเสร็จ');
    
    // Test search with "การลงทุน"
    console.log('\n🔍 ทดสอบการค้นหาคำว่า "การลงทุน"');
    const searchResults = await vectorService.searchSimilarContent('การลงทุน', 3);
    
    console.log('\n📊 ผลการค้นหา:');
    console.log('จำนวนผลลัพธ์:', searchResults.length);
    
    searchResults.forEach((result, index) => {
      console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   ไฟล์: ${result.filename}`);
      console.log(`   Chunk: ${result.chunk_index}`);
      console.log(`   เนื้อหา: ${result.content.substring(0, 100)}...`);
    });
    
    // Test with other queries
    const testQueries = ['หุ้น', 'กองทุน', 'ประกันชีวิต', 'เงินฝาก'];
    
    for (const query of testQueries) {
      console.log(`\n🔍 ทดสอบการค้นหาคำว่า "${query}"`);
      const results = await vectorService.searchSimilarContent(query, 1);
      if (results.length > 0) {
        console.log(`   ✅ พบผลลัพธ์ (Score: ${results[0].score.toFixed(4)})`);
        console.log(`   📄 จาก: ${results[0].filename}`);
        console.log(`   📝 เนื้อหา: ${results[0].content.substring(0, 80)}...`);
      } else {
        console.log('   ❌ ไม่พบผลลัพธ์');
      }
    }
    
    // Get index stats
    console.log('\n📈 สถิติ Pinecone Index:');
    const stats = await vectorService.getIndexStats();
    console.log(stats);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// Run the test
testSearch().then(() => {
  console.log('\n🎉 การทดสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ การทดสอบล้มเหลว:', error);
  process.exit(1);
});