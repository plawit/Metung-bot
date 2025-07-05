// Mock test สำหรับทดสอบการค้นหา "การลงทุน"
const fs = require('fs');
const path = require('path');

// Mock vector search function
function mockVectorSearch(query, documents) {
  console.log(`🔍 Mock การค้นหา: "${query}"`);
  
  // Simple text matching for demo
  const results = [];
  
  documents.forEach((doc, index) => {
    const content = doc.content.toLowerCase();
    const searchTerm = query.toLowerCase();
    
    if (content.includes(searchTerm)) {
      // Simple scoring based on frequency
      const matches = (content.match(new RegExp(searchTerm, 'g')) || []).length;
      const score = matches * 0.8 + (Math.random() * 0.2); // Add some randomness
      
      results.push({
        filename: doc.filename,
        content: doc.content,
        score: score,
        chunk_index: index
      });
    }
  });
  
  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score);
}

// Load documents
function loadDocuments() {
  const documentsPath = path.join(__dirname, 'document');
  const documents = [];
  
  try {
    const files = fs.readdirSync(documentsPath).filter(file => file.endsWith('.txt'));
    
    files.forEach(file => {
      const filePath = path.join(documentsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split into chunks (simulate what Pinecone would do)
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

// Main test function
async function testMockSearch() {
  console.log('🔍 เริ่มทดสอบการค้นหา Mock...');
  
  // Load documents
  const documents = loadDocuments();
  console.log(`📄 โหลดเอกสาร: ${documents.length} chunks`);
  
  // Test with "การลงทุน"
  console.log('\n=== ทดสอบคำว่า "การลงทุน" ===');
  const investmentResults = mockVectorSearch('การลงทุน', documents);
  
  console.log(`\n📊 ผลการค้นหา "การลงทุน": ${investmentResults.length} รายการ`);
  
  investmentResults.forEach((result, index) => {
    console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
    console.log(`   📄 ไฟล์: ${result.filename}`);
    console.log(`   📝 เนื้อหา: ${result.content.substring(0, 150)}...`);
  });
  
  // Test with related terms
  const relatedTerms = ['หุ้น', 'กองทุน', 'ประกันชีวิต', 'เงินฝาก', 'พันธบัตร'];
  
  console.log('\n=== ทดสอบคำที่เกี่ยวข้อง ===');
  relatedTerms.forEach(term => {
    const results = mockVectorSearch(term, documents);
    console.log(`\n🔍 "${term}": ${results.length} ผลลัพธ์`);
    
    if (results.length > 0) {
      console.log(`   ✅ ผลลัพธ์ดีที่สุด (Score: ${results[0].score.toFixed(4)})`);
      console.log(`   📄 จาก: ${results[0].filename}`);
      console.log(`   📝 เนื้อหา: ${results[0].content.substring(0, 100)}...`);
    } else {
      console.log('   ❌ ไม่พบผลลัพธ์');
    }
  });
  
  // Show what content contains "การลงทุน"
  console.log('\n=== เนื้อหาที่มีคำว่า "การลงทุน" ===');
  documents.forEach((doc, index) => {
    if (doc.content.includes('การลงทุน')) {
      console.log(`\n📄 ${doc.filename} (chunk ${doc.chunk_index}):`);
      console.log(`   ${doc.content}`);
    }
  });
  
  console.log('\n🎉 การทดสอบเสร็จสิ้น!');
}

// Run the test
testMockSearch().catch(error => {
  console.error('❌ การทดสอบล้มเหลว:', error);
});