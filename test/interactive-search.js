// Interactive search tool สำหรับทดสอบการค้นหาแบบ interactive
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Mock vector search function
function mockVectorSearch(query, documents) {
  console.log(`🔍 ค้นหา: "${query}"`);
  
  const results = [];
  
  documents.forEach((doc, index) => {
    const content = doc.content.toLowerCase();
    const searchTerm = query.toLowerCase();
    
    if (content.includes(searchTerm)) {
      // Calculate score based on frequency and position
      const matches = (content.match(new RegExp(searchTerm, 'g')) || []).length;
      const position = content.indexOf(searchTerm);
      const score = matches * 0.7 + (position === 0 ? 0.3 : 0.1) + (Math.random() * 0.2);
      
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

// Interactive search function
function interactiveSearch(documents) {
  console.log('\n🎯 โหมดค้นหาแบบ Interactive');
  console.log('💡 พิมพ์คำที่อยากค้นหา (พิมพ์ "exit" เพื่อออก)');
  console.log('📝 คำแนะนำ: การลงทุน, หุ้น, กองทุน, อาหาร, ค่าเช่า, ประกัน, ออม, เงินเดือน\n');
  
  const askQuestion = () => {
    rl.question('🔍 คำค้นหา: ', (query) => {
      if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'ออก') {
        console.log('\n👋 ขอบคุณที่ใช้งาน!');
        rl.close();
        return;
      }
      
      if (query.trim() === '') {
        console.log('⚠️ กรุณาใส่คำค้นหา');
        askQuestion();
        return;
      }
      
      // Perform search
      const results = mockVectorSearch(query.trim(), documents);
      
      if (results.length === 0) {
        console.log('❌ ไม่พบผลลัพธ์สำหรับ "' + query + '"');
        console.log('💡 ลองค้นหาคำอื่น เช่น: การลงทุน, อาหาร, ค่าเช่า, ออม');
      } else {
        console.log(`\n📊 พบผลลัพธ์ ${results.length} รายการ:`);
        
        // Show top 3 results
        results.slice(0, 3).forEach((result, index) => {
          console.log(`\n${index + 1}. 📄 ${result.filename} (Score: ${result.score.toFixed(3)})`);
          console.log(`   📝 ${result.content.substring(0, 120)}${result.content.length > 120 ? '...' : ''}`);
        });
        
        if (results.length > 3) {
          console.log(`\n... และอีก ${results.length - 3} ผลลัพธ์`);
        }
      }
      
      console.log('\n' + '='.repeat(50));
      askQuestion();
    });
  };
  
  askQuestion();
}

// Main function
async function main() {
  console.log('🚀 เริ่มต้น Interactive Search Tool');
  console.log('📚 กำลังโหลดเอกสาร...');
  
  const documents = loadDocuments();
  
  if (documents.length === 0) {
    console.log('❌ ไม่พบเอกสารในโฟลเดอร์ document/');
    process.exit(1);
  }
  
  console.log(`✅ โหลดเอกสารสำเร็จ: ${documents.length} chunks`);
  
  // Show available topics
  const topics = new Set();
  documents.forEach(doc => {
    if (doc.content.includes('###')) {
      const lines = doc.content.split('\n');
      lines.forEach(line => {
        if (line.includes('###')) {
          const topic = line.replace('###', '').trim();
          if (topic && !topic.includes('💰') && !topic.includes('🍽️')) {
            topics.add(topic);
          }
        }
      });
    }
  });
  
  console.log('\n📋 หัวข้อที่มีในเอกสาร:');
  Array.from(topics).slice(0, 10).forEach(topic => {
    console.log(`   • ${topic}`);
  });
  
  interactiveSearch(documents);
}

// Handle exit gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 ขอบคุณที่ใช้งาน!');
  process.exit(0);
});

// Run the application
main().catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});