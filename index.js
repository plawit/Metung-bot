const express = require("express");
const line = require("@line/bot-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const VectorService = require("./services/vectorService");
const PipecodeService = require("./services/pipecodeService");
const AIDataValidator = require("./services/aiDataValidator");
const AIClassifier = require("./services/aiClassifier");
const AIMessageClassifier = require("./services/aiMessageClassifier");
const SupabaseService = require("./services/supabaseService");
const FlexMessageTemplates = require("./services/flexMessageTemplates");
const FinancialReportService = require("./services/financialReportService");
const BankSlipOCR = require("./services/bankSlipOCR");
require("dotenv").config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const client = new line.Client(config);
const app = express();

// CORS for dashboard
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

let financeData = [];
let userSessions = {}; // เก็บประวัติการสนทนาของ user แต่ละคน
let botStatus = {}; // เก็บสถานะบอทของแต่ละ user: 'active' | 'paused'
let activityLogs = []; // เก็บบันทึกกิจกรรม

// ฟังก์ชันเพิ่มข้อความในประวัติการสนทนา (จำกัด 10 ข้อความล่าสุด)
function addToConversationHistory(userId, role, message) {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      conversationHistory: [],
      pendingData: {},
    };
  }

  // เพิ่มข้อความใหม่
  userSessions[userId].conversationHistory.push({
    role: role, // 'user' หรือ 'assistant'
    message: message,
    timestamp: new Date().toISOString(),
  });

  // เก็บเฉพาะ 10 ข้อความล่าสุด
  if (userSessions[userId].conversationHistory.length > 10) {
    userSessions[userId].conversationHistory =
      userSessions[userId].conversationHistory.slice(-10);
  }
}

// ฟังก์ชันจัดการสถานะบอท
function getBotStatus(userId) {
  return botStatus[userId] || "active";
}

function setBotStatus(userId, status) {
  botStatus[userId] = status;
  addActivityLog(userId, `Bot ${status} by admin`);
}

// ฟังก์ชันบันทึกกิจกรรม (จำกัด 100 รายการล่าสุด)
function addActivityLog(userId, action) {
  activityLogs.push({
    timestamp: new Date().toISOString(),
    userId: userId,
    action: action,
  });

  // เก็บเฉพาะ 100 รายการล่าสุด
  if (activityLogs.length > 100) {
    activityLogs = activityLogs.slice(-100);
  }
}

// ฟังก์ชันตรวจสอบว่าผู้ใช้ต้องการคุยกับแอดมิน
function detectAdminRequest(message) {
  const adminKeywords = [
    "คุยกับแอดมิน",
    "ติดต่อแอดมิน",
    "พูดกับคน",
    "คุยกับคน",
    "admin",
    "support",
    "help me",
    "ช่วยหน่อย",
    "มีปัญหา",
    "ไม่เข้าใจ",
    "แปลกๆ",
    "ผิดปกติ",
    "ไม่ได้",
    "error",
  ];

  const lowerMessage = message.toLowerCase();
  return adminKeywords.some((keyword) =>
    lowerMessage.includes(keyword.toLowerCase())
  );
}
const vectorService = new VectorService();
const aiDataValidator = new AIDataValidator(vectorService);
const aiClassifier = new AIClassifier();
const aiMessageClassifier = new AIMessageClassifier(vectorService);
const supabaseService = new SupabaseService();
const bankSlipOCR = new BankSlipOCR();
const pipecodeService = new PipecodeService({
  host: process.env.PIPECODE_HOST || "localhost",
  port: process.env.PIPECODE_PORT || 8080,
  protocol: process.env.PIPECODE_PROTOCOL || "http",
  timeout: process.env.PIPECODE_TIMEOUT || 5000,
});

const FINANCE_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts", "finance-prompt.txt"),
  "utf8"
);

async function callGeminiAI(userMessage, currentData, userId) {
  try {
    // ดึงประวัติการสนทนาของ user
    if (!userSessions[userId]) {
      userSessions[userId] = {
        conversationHistory: [],
        pendingData: {}, // เก็บข้อมูลที่ยังไม่ครบสำหรับการบันทึก
      };
    }

    const userSession = userSessions[userId];

    // Vector search จะถูกจัดการโดย AIMessageClassifier แล้ว

    // เพิ่มประวัติการสนทนาเข้าไปใน prompt
    let conversationContext = "";
    if (userSession.conversationHistory.length > 0) {
      conversationContext =
        "\n\nประวัติการสนทนาก่อนหน้า:\n" +
        userSession.conversationHistory
          .slice(-6)
          .map((h) => `${h.role}: ${h.message}`)
          .join("\n");
    }

    // ใช้ AI จำแนกข้อความและสร้างคำตอบ
    console.log(`AI Message Classifier: "${userMessage}"`);
    const aiMessageResult = await aiMessageClassifier.classifyAndRespond(
      userMessage,
      userSession.conversationHistory,
      userSession.pendingData
    );

    console.log(
      `AI Classification: ${aiMessageResult.messageType}, Finance: ${aiMessageResult.needsFinanceProcessing}`
    );

    // ถ้าไม่ต้องการประมวลผลข้อมูลการเงิน ให้ตอบตรงๆ
    if (!aiMessageResult.needsFinanceProcessing) {
      // บันทึกเฉพาะคำตอบของบอท (ข้อความของ user ถูกบันทึกไปแล้วใน handleEvent)
      addToConversationHistory(userId, "assistant", aiMessageResult.response);

      return aiMessageResult.response;
    }

    // ใช้ AI Data Validator วิเคราะห์ข้อมูลการเงิน
    console.log(`AI Data Validator: "${userMessage}"`);
    const aiValidation = await aiDataValidator.validateAndExtractFinanceData(
      userMessage,
      userSession.conversationHistory,
      userSession.pendingData
    );

    console.log(
      `AI Validation Result: Complete=${aiValidation.isComplete}, Confidence=${aiValidation.confidence}`
    );

    // ถ้าไม่ใช่ข้อมูลการเงินหรือข้อมูลไม่ครบ ให้ตอบตามที่ AI แนะนำ
    if (!aiValidation.isFinanceRelated || !aiValidation.isComplete) {
      // บันทึกข้อมูลบางส่วนที่ได้ไว้ใน session
      if (
        aiValidation.extractedData &&
        Object.keys(aiValidation.extractedData).length > 0
      ) {
        Object.assign(userSession.pendingData, aiValidation.extractedData);
      }

      // บันทึกเฉพาะคำตอบของบอท (ข้อความของ user ถูกบันทึกไปแล้วใน handleEvent)
      addToConversationHistory(userId, "assistant", aiValidation.nextQuestion);

      return aiValidation.nextQuestion || "กรุณาระบุข้อมูลให้ครบถ้วนค่ะ";
    }

    // รวมข้อมูลเบื้องต้น
    let completeData = {
      ...aiValidation.extractedData,
      ลงวันที่: new Date().toLocaleDateString("th-TH"),
    };

    // ถ้ามีรายการและจำนวน ให้ AI จำแนกหมวดหมู่และประเภท
    if (
      completeData.รายการ &&
      completeData.จำนวน &&
      (!completeData.หมวดหมู่ || !completeData.ประเภท)
    ) {
      console.log(`AI จำแนก: ${completeData.รายการ} ${completeData.จำนวน} บาท`);

      const aiResult = await aiClassifier.classifyFinanceData(
        completeData.รายการ,
        completeData.จำนวน,
        userMessage
      );

      if (aiResult.success) {
        completeData.หมวดหมู่ = aiResult.หมวดหมู่;
        completeData.ประเภท = aiResult.ประเภท;
        console.log(
          `AI ผลลัพธ์: ${aiResult.หมวดหมู่} (${aiResult.ประเภท}) - ${aiResult.เหตุผล}`
        );
      } else {
        // fallback เป็นค่าเริ่มต้น
        completeData.หมวดหมู่ = "อื่นๆ";
        completeData.ประเภท = "รายจ่าย";
        console.log("AI Classification failed, using fallback values");
      }
    }

    // ตรวจสอบข้อมูลครบถ้วนหลังจากเพิ่ม auto-classification
    const finalValidation = {
      isComplete:
        completeData.รายการ &&
        completeData.จำนวน &&
        completeData.ประเภท &&
        completeData.หมวดหมู่,
      missingFields: [],
    };

    // หาข้อมูลที่ยังขาดหายไป
    if (!completeData.รายการ) finalValidation.missingFields.push("รายการ");
    if (!completeData.จำนวน) finalValidation.missingFields.push("จำนวน");
    if (!completeData.ประเภท) finalValidation.missingFields.push("ประเภท");
    if (!completeData.หมวดหมู่) finalValidation.missingFields.push("หมวดหมู่");

    // ถ้าข้อมูลไม่ครบ ให้ถามข้อมูลที่ขาดหายไป
    if (!finalValidation.isComplete) {
      const question = `ข้อมูลยังไม่ครบค่ะ ขาด: ${finalValidation.missingFields.join(
        ", "
      )} กรุณาระบุเพิ่มเติมค่ะ`;

      // เก็บข้อมูลบางส่วนไว้ใน session
      Object.assign(userSession.pendingData, completeData);

      // บันทึกประวัติการสนทนา
      userSession.conversationHistory.push(
        { role: "user", message: userMessage },
        { role: "bot", message: question }
      );

      // เก็บแค่ 20 รอบสนทนาล่าสุด
      if (userSession.conversationHistory.length > 20) {
        userSession.conversationHistory =
          userSession.conversationHistory.slice(-20);
      }

      return question;
    }

    // ตรวจสอบข้อมูลซ้ำก่อนบันทึก
    const isDuplicate = financeData.some(
      (item) =>
        item.รายการ === completeData.รายการ &&
        item.จำนวน === completeData.จำนวน &&
        item.ลงวันที่ === completeData.ลงวันที่
    );

    if (isDuplicate) {
      console.log("Duplicate entry detected, skipping save");
      return `ข้อมูลนี้ถูกบันทึกไปแล้วค่ะ: ${completeData.รายการ} ${completeData.จำนวน} บาท`;
    }

    // บันทึกข้อมูลใหม่
    financeData.push(completeData);
    console.log(
      `Saved: ${completeData.รายการ} ${completeData.จำนวน} บาท (${completeData.หมวดหมู่})`
    );

    // บันทึกลง Supabase
    let refId = null;
    try {
      console.log("🔄 Attempting to save to Supabase:", completeData);
      console.log(
        "👤 User ID for save:",
        userId,
        "Last 8 chars:",
        userId ? userId.substring(userId.length - 8) : "null"
      );
      const supabaseResult = await supabaseService.addFinanceRecord(
        userId,
        completeData
      );
      console.log("📊 Supabase result:", supabaseResult);
      if (supabaseResult && supabaseResult.success) {
        refId = supabaseResult.refId;
        completeData.refId = refId; // เก็บ refId ใน local data ด้วย
        console.log("✅ Successfully saved to Supabase with refId:", refId);
      } else {
        console.log("❌ Failed to save to Supabase:", supabaseResult);
      }
    } catch (supabaseError) {
      console.error("❌ Exception while saving to Supabase:", supabaseError);
    }

    // ล้างข้อมูล pending ของ user
    userSession.pendingData = {};

    let confirmMessage = `💰 เฮงมากเลยค่า! บันทึกเงินทองเรียบร้อยแล้ว! ✨\n\n🪙 ${
      completeData.รายการ
    }: ${completeData.จำนวน.toLocaleString()} บาท\n📅 วันที่: ${
      completeData.ลงวันที่
    }\n📂 หมวด: ${completeData.หมวดหมู่}\n\n${
      completeData.ประเภท === "รายรับ"
        ? "🌟 รายรับเข้ามาแล้ว มั่งคั่งขึ้นทุกวัน!"
        : "💎 รายจ่ายที่คุมได้ = ก้าวสู่ความร่ำรวย!"
    }`;

    if (refId) {
      confirmMessage += `\n🔖 รหัสอ้างอิง: ${refId}`;
    }

    // บันทึกเฉพาะคำตอบของบอท (ข้อความของ user ถูกบันทึกไปแล้วใน handleEvent)
    addToConversationHistory(userId, "assistant", confirmMessage);

    return confirmMessage;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "🤖 ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง";
  }
}

// ฟังก์ชันสำหรับสร้างรายงานการเงิน
async function generateFinancialReport(
  reportType,
  userMessage,
  userId,
  financeData
) {
  try {
    switch (reportType) {
      case "daily_summary":
        console.log("🔍 Getting daily report for userId:", userId);
        const dailyData = await FinancialReportService.calculateDailySummary(
          financeData,
          null,
          supabaseService,
          userId
        );
        return FlexMessageTemplates.createDailySummary(dailyData);

      case "daily_transactions":
        const dailyTransactions =
          await FinancialReportService.calculateDailySummary(
            financeData,
            null,
            supabaseService,
            userId
          );
        return FlexMessageTemplates.createTransactionList({
          date: dailyTransactions.date,
          transactions: dailyTransactions.transactionList,
        });

      case "monthly_summary":
        const monthlyData =
          await FinancialReportService.calculateMonthlySummary(
            financeData,
            null,
            null,
            supabaseService,
            userId
          );
        return FlexMessageTemplates.createSimpleMonthlySummary(monthlyData);

      case "balance_report":
        const balanceData = await FinancialReportService.calculateBalanceReport(
          financeData,
          supabaseService,
          userId
        );
        return FlexMessageTemplates.createBalanceReport(balanceData);

      case "recent_transactions":
        const recentTransactions = FinancialReportService.getRecentTransactions(
          financeData,
          10,
          userId
        );
        return FlexMessageTemplates.createTransactionList({
          date: "รายการล่าสุด",
          transactions: recentTransactions,
        });

      case "report_menu":
      default:
        return FlexMessageTemplates.createReportMenu();
    }
  } catch (error) {
    console.error("Error generating financial report:", error);
    return {
      type: "text",
      text: "🤖 ขออภัย เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองใหม่อีกครั้งค่ะ",
    };
  }
}

// ฟังก์ชันจัดการรูปภาพ (สลิปโอนเงิน)
async function handleImageMessage(event) {
  try {
    const userId = event.source.userId;
    console.log(`Received image from user: ${userId}`);

    // ส่งข้อความแจ้งว่าการประมวลผล
    const processingMessage = {
      type: "text",
      text: "📸 มีตังค์กำลังอ่านสลิปให้น้าา... รอสักครู่นะจ๊ะ 🐾",
    };
    await client.replyMessage(event.replyToken, processingMessage);

    // ดาวน์โหลดรูปภาพจาก LINE
    const imageBuffer = await downloadImageFromLine(event.message.id);

    if (!imageBuffer) {
      throw new Error("Cannot download image from LINE");
    }

    // ประมวลผลสลิปด้วย OCR
    const ocrResult = await bankSlipOCR.processSlipImage(imageBuffer);

    if (!ocrResult.success) {
      throw new Error(ocrResult.error || "OCR processing failed");
    }

    // ตรวจสอบว่าเป็นสลิปธนาคารหรือไม่
    if (!bankSlipOCR.isLikelyBankSlip(ocrResult.rawText)) {
      const notSlipMessage = {
        type: "text",
        text: "🤔 รูปนี้ไม่เหมือนสลิปธนาคารน้าา... ลองส่งสลิปโอนเงินที่ชัดๆ ดูน้า 🐱💳",
      };
      return client.pushMessage(userId, notSlipMessage);
    }

    const parsedData = ocrResult.parsedData;

    // ตรวจสอบว่าต้องถามรายการหรือไม่
    if (parsedData.needsDescription) {
      // เก็บข้อมูลชั่วคราวรอให้ผู้ใช้ตอบ
      if (!userSessions[userId]) {
        userSessions[userId] = { conversationHistory: [], pendingData: {} };
      }
      userSessions[userId].pendingData = {
        slipData: parsedData,
        waitingFor: "description",
        timestamp: new Date().toISOString(),
      };

      const askMessage = {
        type: "text",
        text:
          `💰 อ่านสลิปเรียบร้อยแล้ว!\n\n` +
          `จำนวนเงิน: ${parsedData.จำนวน.toLocaleString()} บาท\n` +
          `วันที่: ${parsedData.ลงวันที่}\n\n` +
          `🤔 แต่ไม่สามารถระบุรายการได้ชัดเจน\nกรุณาบอกมีตังค์ว่าเป็นรายการอะไรน้า?\n\n` +
          `(ตัวอย่าง: ค่าอาหาร, ค่าเช่า, ซื้อของใช้)`,
      };

      addToConversationHistory(userId, "user", "[ส่งรูปสลิป]");
      addToConversationHistory(userId, "assistant", "ขอให้ระบุรายการ");

      return client.pushMessage(userId, askMessage);
    }

    // สร้างข้อความยืนยันพร้อม Flex Message
    const confirmMessage = createSlipConfirmMessage(
      parsedData,
      ocrResult.confidence
    );

    // บันทึกข้อมูลทันที (ไม่ต้องรอยืนยัน)
    if (parsedData.จำนวน > 0) {
      // บันทึกใน local data
      financeData.push({
        ...parsedData,
        userId: userId,
        timestamp: new Date().toISOString(),
      });

      // บันทึกลง Supabase
      try {
        console.log("🔄 [SLIP] Attempting to save to Supabase:", parsedData);
        const supabaseResult = await supabaseService.addFinanceRecord(
          userId,
          parsedData
        );
        console.log("📊 [SLIP] Supabase result:", supabaseResult);
        if (supabaseResult && supabaseResult.success) {
          parsedData.refId = supabaseResult.refId;
          console.log(
            "✅ [SLIP] Successfully saved to Supabase with refId:",
            supabaseResult.refId
          );
        } else {
          console.log("❌ [SLIP] Failed to save to Supabase:", supabaseResult);
        }
      } catch (supabaseError) {
        console.error(
          "❌ [SLIP] Exception while saving to Supabase:",
          supabaseError
        );
      }

      // บันทึกประวัติการสนทนา
      addToConversationHistory(userId, "user", "[ส่งรูปสลิป]");
      addToConversationHistory(userId, "assistant", "อ่านสลิปเรียบร้อยแล้ว");
    }

    return client.pushMessage(userId, confirmMessage);
  } catch (error) {
    console.error("Error handling image message:", error);

    const errorMessage = {
      type: "text",
      text: "😿 ขออภัยน้า มีตังค์อ่านสลิปไม่ได้ ลองส่งใหม่หรือพิมพ์ข้อมูลมาเลยน้า 🐱",
    };

    return client.pushMessage(event.source.userId, errorMessage);
  }
}

// ดาวน์โหลดรูปภาพจาก LINE
async function downloadImageFromLine(messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error downloading image from LINE:", error);
    return null;
  }
}

// สร้างข้อความยืนยันสลิป
function createSlipConfirmMessage(parsedData, confidence) {
  const confidenceText =
    confidence >= 0.8
      ? "ความแม่นยำสูง 🎯"
      : confidence >= 0.6
      ? "ความแม่นยำปานกลาง ⚡"
      : "ความแม่นยำต่ำ ⚠️";

  const refText = parsedData.refId
    ? `\n🔖 รหัสอ้างอิง: ${parsedData.refId}`
    : "";

  return {
    type: "text",
    text:
      `📋 อ่านสลิปเรียบร้อยแล้ว!\n\n` +
      `💰 จำนวน: ${parsedData.จำนวน.toLocaleString()} บาท\n` +
      `📝 รายการ: ${parsedData.รายการ}\n` +
      `📂 หมวดหมู่: ${parsedData.หมวดหมู่}\n` +
      `📅 วันที่: ${parsedData.ลงวันที่}\n` +
      `${confidenceText}${refText}\n\n` +
      `✅ บันทึกเรียบร้อยแล้วน้า 🐱`,
  };
}

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== "message") {
    return Promise.resolve(null);
  }

  // Handle image messages (bank slips)
  if (event.message.type === "image") {
    return handleImageMessage(event);
  }

  // Handle text messages
  if (event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim().toLowerCase();

  // Check for menu/service commands first
  if (
    userMessage.includes("เมนู") ||
    userMessage.includes("menu") ||
    userMessage.includes("บริการ") ||
    userMessage.includes("service")
  ) {
    return client.replyMessage(event.replyToken, getQuickReplyMenu());
  }

  try {
    const userId = event.source.userId;
    const userMessage = event.message.text.trim();

    // บันทึกข้อความของผู้ใช้
    addToConversationHistory(userId, "user", userMessage);
    addActivityLog(
      userId,
      `Received message: ${userMessage.substring(0, 50)}...`
    );

    // ตรวจสอบว่ามีข้อมูลสลิปที่รอการระบุรายการหรือไม่
    if (
      userSessions[userId] &&
      userSessions[userId].pendingData &&
      userSessions[userId].pendingData.waitingFor === "description"
    ) {
      const pendingSlip = userSessions[userId].pendingData.slipData;

      // อัปเดทรายการด้วยคำตอบของผู้ใช้
      pendingSlip.รายการ = userMessage.trim();
      pendingSlip.needsDescription = false;

      // จำแนกหมวดหมู่ใหม่ตามรายการที่ผู้ใช้ระบุ
      const bankSlipOCR = new BankSlipOCR();
      pendingSlip.หมวดหมู่ = await bankSlipOCR.categorizeTransaction(
        userMessage,
        userMessage
      );

      // บันทึกข้อมูล
      if (pendingSlip.จำนวน > 0) {
        financeData.push({
          ...pendingSlip,
          userId: userId,
          timestamp: new Date().toISOString(),
        });

        // บันทึกลง Supabase
        try {
          const supabaseResult = await supabaseService.addFinanceRecord(
            userId,
            pendingSlip
          );
          if (supabaseResult && supabaseResult.success) {
            pendingSlip.refId = supabaseResult.refId;
          }
        } catch (supabaseError) {
          console.error("Failed to log slip to Supabase:", supabaseError);
        }
      }

      // ล้างข้อมูลที่รอ
      userSessions[userId].pendingData = {};

      // ส่งข้อความยืนยัน
      const confirmMessage = {
        type: "text",
        text:
          `✅ บันทึกเรียบร้อยแล้วน้า!\n\n` +
          `💰 จำนวน: ${pendingSlip.จำนวน.toLocaleString()} บาท\n` +
          `📝 รายการ: ${pendingSlip.รายการ}\n` +
          `📂 หมวดหมู่: ${pendingSlip.หมวดหมู่}\n` +
          `📅 วันที่: ${pendingSlip.ลงวันที่}\n` +
          (pendingSlip.refId ? `🔖 รหัสอ้างอิง: ${pendingSlip.refId}\n` : "") +
          `\n🐱 ขอบคุณที่ระบุรายการให้ชัดเจนน้า!`,
      };

      addToConversationHistory(userId, "assistant", "บันทึกสลิปเรียบร้อยแล้ว");
      return client.replyMessage(event.replyToken, confirmMessage);
    }

    // ตรวจสอบสถานะบอท
    const currentBotStatus = getBotStatus(userId);

    // ตรวจสอบว่าผู้ใช้ต้องการคุยกับแอดมิน
    if (currentBotStatus === "active" && detectAdminRequest(userMessage)) {
      setBotStatus(userId, "paused");
      const adminNotifyMessage = `🛑 มีตังค์ได้หยุดการทำงานชั่วคราวแล้ว 
      
แอดมินจะเข้ามาตอบคำถามให้เร็วๆ นี้จ้า 👨‍💼

หากต้องการให้มีตังค์กลับมาช่วย พิมพ์ "เปิดบอท" ได้เลยน้า 🐱`;

      const echo = { type: "text", text: adminNotifyMessage };
      addToConversationHistory(userId, "assistant", adminNotifyMessage);
      return client.replyMessage(event.replyToken, echo);
    }

    // หากบอทถูกหยุด ให้ตรวจสอบคำสั่งเปิดบอท
    if (currentBotStatus === "paused") {
      if (
        userMessage.includes("เปิดบอท") ||
        userMessage.includes("กลับมา") ||
        userMessage.includes("resume")
      ) {
        setBotStatus(userId, "active");
        const resumeMessage = `🎉 ยินดีต้อนรับกลับมาจ้า~ มีตังค์พร้อมช่วยแล้วน้า! 🐱💰`;

        const echo = { type: "text", text: resumeMessage };
        addToConversationHistory(userId, "assistant", resumeMessage);
        return client.replyMessage(event.replyToken, echo);
      } else {
        // บอทหยุดทำงาน รอแอดมิน
        const waitingMessage = `⏳ กำลังรอแอดมินตอบอยู่จ้า... 
        
หากต้องการให้มีตังค์กลับมาช่วย พิมพ์ "เปิดบอท" ได้เลยน้า 🐱`;

        const echo = { type: "text", text: waitingMessage };
        return client.replyMessage(event.replyToken, echo);
      }
    }

    // ตรวจสอบว่าเป็นคำถามเกี่ยวกับรายงานการเงินหรือไม่
    if (FinancialReportService.isFinancialReportQuery(userMessage)) {
      const reportType =
        FinancialReportService.classifyReportQuery(userMessage);
      const reportResponse = await generateFinancialReport(
        reportType,
        userMessage,
        userId,
        financeData
      );

      if (reportResponse) {
        addToConversationHistory(
          userId,
          "assistant",
          "ส่งรายงานการเงินแล้วค่ะ"
        );
        return client.replyMessage(event.replyToken, reportResponse);
      }
    }

    const aiResponse = await callGeminiAI(userMessage, financeData, userId);

    // ตรวจสอบว่าเป็น COMPLETE_ENTRY หรือไม่
    if (aiResponse.includes("COMPLETE_ENTRY:")) {
      const jsonMatch = aiResponse.match(/COMPLETE_ENTRY:(\{.*?\})/s);
      if (jsonMatch) {
        try {
          const newEntry = JSON.parse(jsonMatch[1]);
          if (
            newEntry.ลงวันที่ &&
            newEntry.รายการ &&
            newEntry.ประเภท &&
            newEntry.จำนวน &&
            newEntry.หมวดหมู่
          ) {
            financeData.push(newEntry);

            // บันทึกลง Supabase
            try {
              console.log(
                "🔄 [JSON] Attempting to save to Supabase:",
                newEntry
              );
              const supabaseResult = await supabaseService.addFinanceRecord(
                userId,
                newEntry
              );
              console.log("📊 [JSON] Supabase result:", supabaseResult);
              if (supabaseResult && supabaseResult.success) {
                console.log(
                  "✅ [JSON] Successfully saved to Supabase with refId:",
                  supabaseResult.refId
                );
              } else {
                console.log(
                  "❌ [JSON] Failed to save to Supabase:",
                  supabaseResult
                );
              }
            } catch (supabaseError) {
              console.error(
                "❌ [JSON] Exception while saving to Supabase:",
                supabaseError
              );
            }

            // ล้างข้อมูล pending ของ user
            if (userSessions[userId]) {
              userSessions[userId].pendingData = {};
            }

            const confirmMessage = `💰 บันทึกเรียบร้อยแล้ว!\n\n📝 ${
              newEntry.รายการ
            }: ${newEntry.จำนวน.toLocaleString()} บาท\n📅 วันที่: ${
              newEntry.ลงวันที่
            }\n📂 หมวด: ${newEntry.หมวดหมู่}`;

            // บันทึกคำตอบของ AI
            addToConversationHistory(userId, "assistant", confirmMessage);

            const echo = { type: "text", text: confirmMessage };
            return client.replyMessage(event.replyToken, echo);
          }
        } catch (parseError) {
          console.error("Error parsing COMPLETE_ENTRY:", parseError);
        }
      }
    }

    // ส่งคำตอบปกติ (ไม่ใช่ JSON)
    const cleanResponse = aiResponse
      .replace(/COMPLETE_ENTRY:\{.*?\}/s, "")
      .trim();

    // บันทึกคำตอบของ AI
    addToConversationHistory(userId, "assistant", cleanResponse);

    const echo = { type: "text", text: cleanResponse };
    return client.replyMessage(event.replyToken, echo);
  } catch (error) {
    console.error("Error handling message:", error);
    const errorMessage =
      "🤖 ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง";
    const echo = { type: "text", text: errorMessage };
    return client.replyMessage(event.replyToken, echo);
  }
}

function getQuickReplyMenu() {
  return {
    type: "text",
    text: "🎯 เลือกบริการที่ต้องการ:",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "💰 บันทึกรายรับ",
            text: "บันทึกรายรับ",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "💸 บันทึกรายจ่าย",
            text: "บันทึกรายจ่าย",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "📊 ดูสรุปรายวัน",
            text: "ดูสรุปรายวัน",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "📈 ดูสรุปรายเดือน",
            text: "ดูสรุปรายเดือน",
          },
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "ℹ️ วิธีใช้งาน",
            text: "วิธีใช้งาน",
          },
        },
      ],
    },
  };
}

// Initialize vector service and start server
async function startServer() {
  try {
    // Initialize Supabase service first
    console.log("Initializing Supabase Service...");
    const supabaseInitialized = await supabaseService.initialize();
    if (supabaseInitialized) {
      console.log("Supabase service initialized successfully");
    }

    // Initialize Vector Service with retry and timeout
    console.log("Initializing Vector Service...");
    try {
      await Promise.race([
        vectorService.initialize(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Vector service timeout")), 10000)
        ),
      ]);

      // Process documents on startup with timeout
      const vectorCount = await Promise.race([
        vectorService.processDocuments(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Document processing timeout")),
            15000
          )
        ),
      ]);
      console.log(`Processed ${vectorCount} document chunks`);
    } catch (vectorError) {
      console.warn(
        "Vector Service initialization failed, continuing without it:",
        vectorError.message
      );
      console.log("Bot will run with limited functionality (no vector search)");
    }

    const port = process.env.PORT || 8080;
    app.listen(port, "0.0.0.0", () => {
      console.log(`RecordMoney LINE Bot listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Add route for updating documents
app.post("/update-documents", async (req, res) => {
  try {
    const vectorCount = await vectorService.updateDocuments();
    res.json({
      success: true,
      message: `Successfully updated ${vectorCount} document vectors`,
    });
  } catch (error) {
    console.error("Error updating documents:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add route for checking vector database stats
app.get("/vector-stats", async (req, res) => {
  try {
    const stats = await vectorService.getIndexStats();
    res.json(stats);
  } catch (error) {
    console.error("Error getting vector stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add routes for pipecode testing
app.get("/test-pipecode", async (req, res) => {
  try {
    const result = await pipecodeService.testConnection();
    res.json({
      success: true,
      message: "Pipecode connection test completed",
      result: result,
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Pipecode connection test failed",
      error: error,
    });
  }
});

app.get("/pipecode-status", (req, res) => {
  const status = pipecodeService.getStatus();
  res.json({
    success: true,
    status: status,
  });
});

app.post("/pipecode-send", async (req, res) => {
  try {
    const data = req.body;
    const result = await pipecodeService.sendData(data);
    res.json({
      success: true,
      message: "Data sent to pipecode successfully",
      result: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send data to pipecode",
      error: error,
    });
  }
});

// Debug endpoint เพื่อดูประวัติการสนทนา
app.get("/conversations/:userId?", (req, res) => {
  try {
    const userId = req.params.userId;

    if (userId) {
      // ดูประวัติของ user คนเดียว
      const userSession = userSessions[userId];
      if (userSession) {
        res.json({
          success: true,
          userId: userId,
          conversationHistory: userSession.conversationHistory,
          pendingData: userSession.pendingData,
          totalMessages: userSession.conversationHistory.length,
          botStatus: getBotStatus(userId),
        });
      } else {
        res.json({
          success: false,
          message: "User not found or no conversation history",
        });
      }
    } else {
      // ดูสรุปทุก user
      const summary = Object.keys(userSessions).map((id) => ({
        userId: id,
        messageCount: userSessions[id].conversationHistory.length,
        lastMessage:
          userSessions[id].conversationHistory.length > 0
            ? userSessions[id].conversationHistory[
                userSessions[id].conversationHistory.length - 1
              ]
            : null,
        hasPendingData: Object.keys(userSessions[id].pendingData).length > 0,
      }));

      res.json({
        success: true,
        totalUsers: Object.keys(userSessions).length,
        users: summary,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get conversation history",
      error: error.message,
    });
  }
});

// Admin Dashboard Routes
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/admin-dashboard.html");
});

// Admin API - Get all users with bot status
app.get("/admin/users", (req, res) => {
  try {
    const users = Object.keys(userSessions).map((userId) => ({
      userId: userId,
      messageCount: userSessions[userId].conversationHistory.length,
      lastMessage:
        userSessions[userId].conversationHistory.length > 0
          ? userSessions[userId].conversationHistory[
              userSessions[userId].conversationHistory.length - 1
            ]
          : null,
      hasPendingData: Object.keys(userSessions[userId].pendingData).length > 0,
      botStatus: getBotStatus(userId),
    }));

    res.json({
      success: true,
      users: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get users",
      error: error.message,
    });
  }
});

// Admin API - Get conversations (enhanced version)
app.get("/admin/conversations", (req, res) => {
  try {
    const summary = Object.keys(userSessions).map((id) => ({
      userId: id,
      messageCount: userSessions[id].conversationHistory.length,
      lastMessage:
        userSessions[id].conversationHistory.length > 0
          ? userSessions[id].conversationHistory[
              userSessions[id].conversationHistory.length - 1
            ]
          : null,
      hasPendingData: Object.keys(userSessions[id].pendingData).length > 0,
      botStatus: getBotStatus(id),
      conversationHistory: userSessions[id].conversationHistory,
    }));

    res.json({
      success: true,
      totalUsers: Object.keys(userSessions).length,
      users: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get conversation history",
      error: error.message,
    });
  }
});

// Admin API - Get bot status statistics
app.get("/admin/bot-status", (req, res) => {
  try {
    const activeUsers = Object.keys(userSessions);
    const activeBots = activeUsers.filter(
      (userId) => getBotStatus(userId) === "active"
    ).length;
    const pausedBots = activeUsers.filter(
      (userId) => getBotStatus(userId) === "paused"
    ).length;

    res.json({
      success: true,
      totalUsers: activeUsers.length,
      activeBots: activeBots,
      pausedBots: pausedBots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get bot status",
      error: error.message,
    });
  }
});

// Admin API - Get activity logs
app.get("/admin/activity-logs", (req, res) => {
  try {
    res.json({
      success: true,
      logs: activityLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get activity logs",
      error: error.message,
    });
  }
});

// Admin API - Pause bot for specific user
app.post("/admin/pause-bot", express.json(), (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    setBotStatus(userId, "paused");

    res.json({
      success: true,
      message: `Bot paused for user ${userId}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to pause bot",
      error: error.message,
    });
  }
});

// Admin API - Resume bot for specific user
app.post("/admin/resume-bot", express.json(), (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    setBotStatus(userId, "active");

    res.json({
      success: true,
      message: `Bot resumed for user ${userId}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to resume bot",
      error: error.message,
    });
  }
});

// Add test data endpoint (for development only)
app.post("/admin/add-test-data", express.json(), (req, res) => {
  try {
    const testData = req.body;

    // Add test user sessions
    Object.keys(testData).forEach((userId) => {
      userSessions[userId] = testData[userId];
      // Set random bot status
      botStatus[userId] = Math.random() > 0.5 ? "active" : "paused";
    });

    addActivityLog(
      "System",
      `Added ${Object.keys(testData).length} test users`
    );

    res.json({
      success: true,
      message: `Added ${Object.keys(testData).length} test users`,
      users: Object.keys(testData),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add test data",
      error: error.message,
    });
  }
});

// Supabase API endpoints
app.get("/supabase/find/:refId", async (req, res) => {
  try {
    const { refId } = req.params;
    const result = await supabaseService.getRecordByRefId(refId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.put("/supabase/update/:refId", async (req, res) => {
  try {
    const { refId } = req.params;
    const updateData = req.body;
    const result = await supabaseService.updateRecordByRefId(refId, updateData);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.get("/supabase/test", async (req, res) => {
  try {
    const result = await supabaseService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to test Supabase connection",
      error: error.message,
    });
  }
});

app.get("/supabase/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await supabaseService.getRecentRecords(limit);
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get recent records",
      error: error.message,
    });
  }
});

app.post("/supabase/test-record", express.json(), async (req, res) => {
  try {
    const testData = {
      รายการ: "ทดสอบระบบ",
      จำนวน: 100,
      ประเภท: "รายจ่าย",
      หมวดหมู่: "ทดสอบ",
      ลงวันที่: new Date().toLocaleDateString("th-TH"),
    };

    const result = await supabaseService.addFinanceRecord(
      "test-user-123",
      testData
    );
    res.json({
      success: result,
      message: result
        ? "Test record added successfully"
        : "Failed to add test record",
      data: testData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add test record",
      error: error.message,
    });
  }
});

startServer();
