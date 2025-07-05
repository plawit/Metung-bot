const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIDataValidator {
  constructor(vectorService = null) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.vectorService = vectorService;
  }

  // ฟังก์ชันใช้ AI วิเคราะห์และแยกข้อมูลการเงิน
  async validateAndExtractFinanceData(userMessage, conversationHistory = [], pendingData = {}) {
    try {
      // ค้นหาเอกสารที่เกี่ยวข้องจาก Pinecone
      let vectorContext = '';
      if (this.vectorService) {
        try {
          const relevantContent = await this.vectorService.searchSimilarContent(userMessage, 2);
          if (relevantContent.length > 0) {
            vectorContext = '\n\nข้อมูลอ้างอิงจากเอกสาร:\n' + 
              relevantContent.map((content, index) => 
                `${index + 1}. ${content.content}`
              ).join('\n');
          }
        } catch (vectorError) {
          console.error('Vector search error:', vectorError);
        }
      }

      // สร้างบริบทจากประวัติการสนทนา
      let contextHistory = '';
      if (conversationHistory.length > 0) {
        contextHistory = '\nประวัติการสนทนาล่าสุด:\n' + 
          conversationHistory.slice(-6).map(h => `${h.role}: ${h.message}`).join('\n');
      }

      // ข้อมูลที่รอการบันทึก
      let pendingContext = '';
      if (Object.keys(pendingData).length > 0) {
        pendingContext = '\nข้อมูลที่รอการบันทึก: ' + JSON.stringify(pendingData);
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลการเงินส่วนบุคคล

หน้าที่ของคุณ:
- วิเคราะห์ข้อความเพื่อแยกข้อมูลการเงิน
- ตรวจสอบความครบถ้วนของข้อมูล
- สร้างคำถามเพื่อขอข้อมูลที่ขาดหายไป
- จำแนกหมวดหมู่และประเภทอัตโนมัติ

${vectorContext}${contextHistory}${pendingContext}

ข้อความจากผู้ใช้: "${userMessage}"

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON เท่านั้น (ห่อด้วย \\\`\\\`\\\`json และ \\\`\\\`\\\`):
{
  "isFinanceRelated": true/false,
  "isComplete": true/false,
  "extractedData": {
    "รายการ": "ชื่อรายการ (ถ้ามี)",
    "จำนวน": จำนวนเงิน (ถ้ามี),
    "ประเภท": "รายรับ/รายจ่าย (ถ้าระบุได้)",
    "หมวดหมู่": "หมวดหมู่ (ถ้าระบุได้)",
    "ลงวันที่": "วันที่ปัจจุบัน"
  },
  "missingFields": ["รายการที่ขาดหายไป"],
  "nextQuestion": "คำถามที่ต้องถามต่อ (ถ้าข้อมูลไม่ครบ)",
  "confidence": 0.0-1.0
}

กฎการวิเคราะห์:
1. isFinanceRelated: true หากข้อความเกี่ยวกับการเงิน (มีตัวเลข, การซื้อ-ขาย, ชื่อสินค้า/บริการ)
2. isComplete: true หากมีข้อมูลครบ (รายการ + จำนวน + ประเภท + หมวดหมู่)
3. extractedData: ข้อมูลที่แยกได้จากข้อความและประวัติการสนทนา
4. missingFields: ข้อมูลที่ยังขาดหายไป
5. nextQuestion: คำถามที่เหมาะสมเพื่อขอข้อมูลที่ขาด
6. confidence: ความมั่นใจในการวิเคราะห์

หมวดหมู่ที่มี:
- อาหาร: อาหารทุกประเภท เครื่องดื่ม ขนม
- เครื่องดื่ม: น้ำ กาแฟ ชา เครื่องดื่มทุกชนิด  
- ค่าเดินทาง: น้ำมัน แก๊ส ค่ารถ ค่าโดยสาร จอดรถ
- เสื้อผ้า: เสื้อผ้า รองเท้า เครื่องแต่งกาย
- ค่าบ้าน: ค่าเช่า ค่าไฟ ค่าน้ำ ของใช้ในบ้าน
- การแพทย์: ยา หมอ โรงพยาบาล ความงาม
- ความบันเทิง: หนัง เกม ท่องเที่ยว งานเลี้ยง
- การศึกษา: หนังสือ ค่าเรียน อบรม
- เงินเดือน: เงินเดือน โบนัส ค่าตอบแทน
- การลงทุน: หุ้น กองทุน ทอง ดอกเบี้ย
- อื่นๆ: สิ่งที่ไม่อยู่ในหมวดอื่น

ตัวอย่าง:

User: "ซื้อน้ำ 50"
Response: {
  "isFinanceRelated": true,
  "isComplete": true,
  "extractedData": {
    "รายการ": "น้ำ",
    "จำนวน": 50,
    "ประเภท": "รายจ่าย",
    "หมวดหมู่": "เครื่องดื่ม",
    "ลงวันที่": "2/7/2568"
  },
  "missingFields": [],
  "nextQuestion": "",
  "confidence": 0.95
}

User: "200"
Response: {
  "isFinanceRelated": true,
  "isComplete": false,
  "extractedData": {
    "จำนวน": 200,
    "ลงวันที่": "2/7/2568"
  },
  "missingFields": ["รายการ", "ประเภท", "หมวดหมู่"],
  "nextQuestion": "จำนวน 200 บาท รายการอะไรคะ?",
  "confidence": 0.8
}

User: "คุณเก่งมาก"
Response: {
  "isFinanceRelated": false,
  "isComplete": false,
  "extractedData": {},
  "missingFields": [],
  "nextQuestion": "",
  "confidence": 0.9
}

ตอบเฉพาะ JSON ที่ห่อด้วย \\\`\\\`\\\`json และ \\\`\\\`\\\` เท่านั้น ไม่ต้องมีข้อความอธิบายเพิ่มเติม`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      console.log('AI Data Validator Raw Response:', responseText);

      // ลองแยก JSON จากคำตอบ - ปรับปรุงการหา JSON
      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
      }
      
      if (jsonMatch) {
        try {
          const jsonText = jsonMatch[1] || jsonMatch[0];
          console.log('Extracted JSON text:', jsonText);
          
          const analysis = JSON.parse(jsonText);
          
          // ตรวจสอบความถูกต้องของ JSON
          if (analysis.hasOwnProperty('isFinanceRelated') && 
              analysis.hasOwnProperty('isComplete') && 
              analysis.extractedData) {
            
            // เพิ่มวันที่ปัจจุบันถ้าไม่มี
            if (!analysis.extractedData.ลงวันที่) {
              analysis.extractedData.ลงวันที่ = new Date().toLocaleDateString('th-TH');
            }
            
            console.log('AI Data Validator Success:', analysis);
            return {
              success: true,
              ...analysis
            };
          }
        } catch (parseError) {
          console.error("Error parsing AI data validation:", parseError);
          console.error("Raw response for debugging:", responseText);
        }
      } else {
        console.error("No JSON found in AI response:", responseText);
      }

      // ถ้าไม่สามารถแยก JSON ได้ ให้ fallback
      console.log('Using fallback response for:', userMessage);
      const isFinance = this.containsFinanceKeywords(userMessage);
      
      return {
        success: false,
        isFinanceRelated: isFinance,
        isComplete: false,
        extractedData: isFinance ? { รายการ: userMessage.replace(/ซื้อ|จ่าย/, '').trim() } : {},
        missingFields: isFinance ? ['จำนวน', 'ประเภท', 'หมวดหมู่'] : ['รายการ', 'จำนวน', 'ประเภท', 'หมวดหมู่'],
        nextQuestion: isFinance ? `${userMessage.replace(/ซื้อ|จ่าย/, '').trim()} เท่าไหร่คะ?` : "มีรายการอะไรที่ต้องการบันทึกคะ?",
        confidence: 0.3
      };

    } catch (error) {
      console.error("AI Data Validation Error:", error);
      return {
        success: false,
        isFinanceRelated: this.containsFinanceKeywords(userMessage),
        isComplete: false,
        extractedData: {},
        missingFields: ['รายการ', 'จำนวน', 'ประเภท', 'หมวดหมู่'],
        nextQuestion: "🤖 ขออภัย เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งค่ะ",
        confidence: 0.1
      };
    }
  }

  // ฟังก์ชัน fallback ตรวจสอบคำสำคัญการเงิน
  containsFinanceKeywords(text) {
    const financeKeywords = [
      /\d+/, // ตัวเลข
      /บาท|฿/,
      /ซื้อ|จ่าย|ใช้|เติม|ค่า|จ้าง|เช่า|ได้|รับ/
    ];
    
    return financeKeywords.some(pattern => pattern.test(text));
  }

  // ฟังก์ชันตรวจสอบความน่าเชื่อถือของผลลัพธ์
  validateResult(result) {
    return result.success && 
           typeof result.isFinanceRelated === 'boolean' &&
           typeof result.isComplete === 'boolean' &&
           typeof result.extractedData === 'object' &&
           Array.isArray(result.missingFields) &&
           typeof result.nextQuestion === 'string' &&
           typeof result.confidence === 'number';
  }
}

module.exports = AIDataValidator;