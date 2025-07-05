// Add test conversation data
const express = require('express');

// Add test data to simulate conversations
const testUserSessions = {
  'testuser123': {
    conversationHistory: [
      {
        role: 'user',
        message: 'สวัสดีครับ',
        timestamp: new Date(Date.now() - 10000).toISOString()
      },
      {
        role: 'assistant', 
        message: 'สวัสดีจ้า~ 🐾 มีตังค์พร้อมช่วยบันทึกรายรับรายจ่ายแล้วน้า 💰',
        timestamp: new Date(Date.now() - 9500).toISOString()
      },
      {
        role: 'user',
        message: 'ซื้อกาแฟ 50 บาท',
        timestamp: new Date(Date.now() - 8000).toISOString()
      },
      {
        role: 'assistant',
        message: 'พร้อมบันทึกแล้วน้า~ 🐱☕ รายจ่าย: กาแฟ 50 บาท',
        timestamp: new Date(Date.now() - 7500).toISOString()
      },
      {
        role: 'user',
        message: 'คุยกับแอดมิน',
        timestamp: new Date(Date.now() - 5000).toISOString()
      },
      {
        role: 'assistant',
        message: '🛑 มีตังค์ได้หยุดการทำงานชั่วคราวแล้ว แอดมินจะเข้ามาตอบคำถามให้เร็วๆ นี้จ้า 👨‍💼',
        timestamp: new Date(Date.now() - 4500).toISOString()
      }
    ],
    pendingData: {}
  },
  'testuser456': {
    conversationHistory: [
      {
        role: 'user',
        message: 'เงินเดือน 30000',
        timestamp: new Date(Date.now() - 15000).toISOString()
      },
      {
        role: 'assistant',
        message: 'บันทึกแล้วจ้า~ 💰 รายรับ: เงินเดือน 30,000 บาท 🎉',
        timestamp: new Date(Date.now() - 14500).toISOString()
      }
    ],
    pendingData: {}
  }
};

// Make a POST request to add test data
async function addTestData() {
  try {
    // Add test conversations via API call
    const response = await fetch('http://localhost:3000/admin/add-test-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUserSessions)
    });
    
    if (response.ok) {
      console.log('✅ Test data added successfully');
    } else {
      console.log('❌ Failed to add test data');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addTestData();