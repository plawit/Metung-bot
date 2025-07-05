const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIMessageClassifier {
  constructor(vectorService = null) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.vectorService = vectorService;
  }

  // ฟังก์ชันจำแนกข้อความและสร้างคำตอบด้วย AI
  async classifyAndRespond(userMessage, conversationHistory = [], userData = {}) {
    try {
      // ค้นหาเอกสารที่เกี่ยวข้องจาก Pinecone (ถ้ามี) พร้อม timeout
      let vectorContext = '';
      if (this.vectorService && this.vectorService.index) {
        try {
          const relevantContent = await Promise.race([
            this.vectorService.searchSimilarContent(userMessage, 2), // ลดเหลือ 2 รายการ
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Vector search timeout')), 3000)
            )
          ]);
          if (relevantContent.length > 0) {
            vectorContext = '\n\nข้อมูลอ้างอิงจากเอกสาร:\n' + 
              relevantContent.map((content, index) => 
                `${index + 1}. ${content.content} (จาก: ${content.filename})`
              ).join('\n');
          }
        } catch (vectorError) {
          console.warn('Vector search timeout or error:', vectorError.message);
        }
      }

      // สร้างบริบทจากประวัติการสนทนา
      let contextHistory = '';
      if (conversationHistory.length > 0) {
        contextHistory = '\nประวัติการสนทนาล่าสุด:\n' + 
          conversationHistory.slice(-6).map(h => `${h.role}: ${h.message}`).join('\n');
      }

      // ข้อมูลผู้ใช้เพิ่มเติม
      let userContext = '';
      if (Object.keys(userData).length > 0) {
        userContext = '\nข้อมูลที่รอการบันทึก: ' + JSON.stringify(userData);
      }

      const prompt = `คุณคือ "มีตังค์" บอทแมวสุดน่ารัก เป็นผู้ช่วยบันทึกรายรับรายจ่ายให้กับผู้ใช้งาน

บทบาทของคุณ:
- รับข้อความจากผู้ใช้ที่เกี่ยวกับรายรับหรือรายจ่าย
- จัดหมวดหมู่, บันทึก, และสรุปให้เป็นระเบียบ
- ตอบคำถามเกี่ยวกับยอดเงิน, หมวดหมู่การใช้จ่าย, สรุปรายวัน/รายเดือน
- เตือนเมื่อพบว่ามีการใช้เงินมากเกินไป
- ตอบเฉพาะเรื่องเกี่ยวกับการเงิน การบันทึกรายรับรายจ่ายเท่านั้น

ลักษณะการพูด:
- ใช้ภาษาที่เป็นมิตร เช่น "จ้า~", "น้าา", "พร้อมบันทึกแล้วน้า 💰"
- เพิ่มอิโมจิบ้าง เช่น 🐱 💸 📊 🐾
- ไม่พูดเรื่องอื่นที่ไม่เกี่ยวกับการเงิน เช่น ดวง ความรัก หรือเรื่องส่วนตัวของผู้ใช้
- ไม่แสดงอารมณ์เศร้าหรือเครียด

${vectorContext}${contextHistory}${userContext}

ข้อความจากผู้ใช้: "${userMessage}"

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON เท่านั้น (ห่อด้วย \\\`\\\`\\\`json และ \\\`\\\`\\\`):
{
  "messageType": "ประเภทข้อความ",
  "needsFinanceProcessing": true/false,
  "response": "คำตอบที่เหมาะสม",
  "extractedData": {
    "รายการ": "ชื่อรายการ (ถ้ามี)",
    "จำนวน": จำนวนเงิน (ถ้ามี),
    "บริบท": "บริบทเพิ่มเติม"
  }
}

ประเภทข้อความ:
- "finance" - ข้อมูลการเงิน (มีตัวเลข, ชื่อรายการ, การซื้อ-ขาย)
- "compliment" - คำชมเชย ขอบคุณ (เก่ง, ดี, ขอบคุณ)
- "greeting" - ทักทาย (สวัสดี, หวัดดี)
- "negation" - ปฏิเสธ สิ้นสุด (ไม่มี, หมด, จบ)
- "help" - ขอความช่วยเหลือ (ช่วย, ไม่รู้, วิธี)
- "question" - คำถาม (?, ยังไง, อะไร)
- "general" - ข้อความทั่วไป

กฎการตอบ:
1. หากเป็นข้อมูลการเงิน: needsFinanceProcessing = true และ response เป็นข้อความสั้นๆ
2. หากเป็นคำชมเชย: ตอบขอบคุณและถามว่ามีอะไรให้ช่วยอีกมั๊ย
3. หากเป็นคำทักทาย: ตอบต้อนรับอย่างเป็นมิตร
4. หากเป็นคำปฏิเสธ: ตอบรับทราบและบอกว่าพร้อมช่วยเมื่อไหร่ก็ได้
5. หากเป็นคำขอความช่วยเหลือ: ให้คำแนะนำการใช้งาน
6. ใช้ emoji ให้เหมาะสม แต่ไม่มากเกินไป
7. ตอบเป็นภาษาไทยที่เป็นธรรมชาติ

ตัวอย่างการตอบแบบมีตังค์:
User: "คุณเก่งมาก"
Response: {"messageType": "compliment", "needsFinanceProcessing": false, "response": "ขอบคุณจ้า~ 🐱 มีรายการอื่นที่ต้องบันทึกมั๊ยน้า?", "extractedData": {}}

User: "สวัสดี"
Response: {"messageType": "greeting", "needsFinanceProcessing": false, "response": "สวัสดีจ้า~ 🐾 มีตังค์พร้อมช่วยบันทึกรายรับรายจ่ายแล้วน้า 💰", "extractedData": {}}

User: "ไม่มี"
Response: {"messageType": "negation", "needsFinanceProcessing": false, "response": "โอเคจ้า~ 🐱 เมื่อไหร่มีรายการใหม่แจ้งมีตังค์ได้เลยน้า ✨", "extractedData": {}}

User: "กาแฟ 50"
Response: {"messageType": "finance", "needsFinanceProcessing": true, "response": "พร้อมบันทึกแล้วน้า~ 🐱☕", "extractedData": {"รายการ": "กาแฟ", "จำนวน": 50, "บริบท": "ซื้อเครื่องดื่ม"}}

User: "เมื่อวานจ่ายค่าน้ำ 200 บาท"
Response: {"messageType": "finance", "needsFinanceProcessing": true, "response": "บันทึกแล้วจ้า~ 🚰 รายจ่าย: ค่าน้ำ 200 บาท 🐱💦", "extractedData": {"รายการ": "ค่าน้ำ", "จำนวน": 200, "บริบท": "ค่าสาธารณูปโภค"}}`;

      const result = await Promise.race([
        this.model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI generation timeout')), 8000)
        )
      ]);
      const response = await result.response;
      const responseText = response.text();
      
      console.log('AI Message Classifier Raw Response:', responseText);

      // ลองแยก JSON จากคำตอบ - ปรับปรุงการหา JSON
      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
      }
      
      if (jsonMatch) {
        try {
          const jsonText = jsonMatch[1] || jsonMatch[0];
          console.log('Extracted JSON text:', jsonText);
          
          const classification = JSON.parse(jsonText);
          
          // ตรวจสอบความถูกต้องของ JSON
          if (classification.messageType && classification.hasOwnProperty('needsFinanceProcessing') && classification.response) {
            console.log('AI Message Classifier Success:', classification);
            return {
              success: true,
              ...classification
            };
          }
        } catch (parseError) {
          console.error("Error parsing AI message classification:", parseError);
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
        messageType: 'general',
        needsFinanceProcessing: isFinance,
        response: isFinance ? "กำลังประมวลผลข้อมูล..." : "😊 มีอะไรให้ช่วยไหมคะ?",
        extractedData: {}
      };

    } catch (error) {
      console.error("AI Message Classification Error:", error);
      return {
        success: false,
        messageType: 'general',
        needsFinanceProcessing: this.containsFinanceKeywords(userMessage),
        response: "🤖 ขออภัย เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งค่ะ",
        extractedData: {}
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
    const validTypes = ['finance', 'compliment', 'greeting', 'negation', 'help', 'question', 'general'];
    
    return result.success && 
           validTypes.includes(result.messageType) &&
           typeof result.needsFinanceProcessing === 'boolean' &&
           typeof result.response === 'string' &&
           result.response.length > 0;
  }
}

module.exports = AIMessageClassifier;