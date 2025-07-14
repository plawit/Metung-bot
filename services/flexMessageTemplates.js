// Flex Message Templates for Financial Reports
class FlexMessageTemplates {
  // สรุปรายรับรายจ่ายรายวัน
  static createDailySummary(data) {
    const { date, income, expense, balance, transactions } = data;

    return {
      type: "flex",
      altText: `สรุปการเงินวันที่ ${date}`,
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#4CAF50" },
          body: { backgroundColor: "#F8F9FA" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📊 สรุปการเงินประจำวัน",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center",
            },
            {
              type: "text",
              text: date,
              color: "#FFFFFF",
              size: "sm",
              align: "center",
              margin: "xs",
            },
          ],
          paddingAll: "15px",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "15px",
          contents: [
            // รายรับ
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💰 รายรับ",
                  weight: "bold",
                  color: "#4CAF50",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `+${income.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#4CAF50",
                  align: "end",
                },
              ],
            },
            // รายจ่าย
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💸 รายจ่าย",
                  weight: "bold",
                  color: "#F44336",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `-${expense.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#F44336",
                  align: "end",
                },
              ],
            },
            {
              type: "separator",
              margin: "md",
            },
            // ยอดคงเหลือ
            {
              type: "separator",
              margin: "md",
            },
            // จำนวนรายการ
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "📝 จำนวนรายการ",
                  color: "#666666",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${transactions} รายการ`,
                  color: "#666666",
                  size: "sm",
                  align: "end",
                },
              ],
            },
          ],
        },
      },
    };
  }

  // รายการธุรกรรมประจำวัน
  static createTransactionList(data) {
    const { date, transactions } = data;

    const transactionItems = transactions.slice(0, 10).map((item) => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          flex: 3,
          contents: [
            {
              type: "text",
              text: item.รายการ,
              weight: "bold",
              size: "sm",
              color: "#333333",
            },
            {
              type: "text",
              text: `${item.หมวดหมู่} • ${item.ลงวันที่}`,
              size: "xs",
              color: "#666666",
              margin: "xs",
            },
          ],
        },
        {
          type: "text",
          text: `${
            item.ประเภท === "รายรับ" ? "+" : "-"
          }${item.จำนวน.toLocaleString()}`,
          weight: "bold",
          color: item.ประเภท === "รายรับ" ? "#4CAF50" : "#F44336",
          align: "end",
          flex: 2,
        },
        {
          type: "text",
          text: item.refId ? `#${item.refId}` : "",
          size: "xs",
          color: "#999999",
          align: "end",
          flex: 1,
        },
      ],
      margin: "md",
    }));

    return {
      type: "flex",
      altText: `รายการธุรกรรมวันที่ ${date}`,
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#2196F3" },
          body: { backgroundColor: "#F8F9FA" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📋 รายการธุรกรรม",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center",
            },
            {
              type: "text",
              text: `${date} (${transactions.length} รายการ)`,
              color: "#FFFFFF",
              size: "sm",
              align: "center",
              margin: "xs",
            },
          ],
          paddingAll: "15px",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: transactionItems,
          paddingAll: "15px",
        },
        footer:
          transactions.length > 10
            ? {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: `แสดง 10 รายการแรก จากทั้งหมด ${transactions.length} รายการ`,
                    size: "xs",
                    color: "#666666",
                    align: "center",
                  },
                ],
                paddingAll: "10px",
              }
            : undefined,
      },
    };
  }

  // สรุปรายเดือน
  static createMonthlySummary(data) {
    const {
      month,
      year,
      income,
      expense,
      balance,
      topCategories,
      totalTransactions,
    } = data;

    const categoryItems = topCategories.slice(0, 5).map((cat) => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: cat.หมวดหมู่,
          flex: 2,
          size: "sm",
          color: "#333333",
        },
        {
          type: "text",
          text: `${cat.จำนวน.toLocaleString()} บาท`,
          flex: 1,
          size: "sm",
          color: "#666666",
          align: "end",
        },
      ],
      margin: "sm",
    }));

    return {
      type: "flex",
      altText: `สรุปการเงินประจำเดือน ${month}/${year}`,
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#9C27B0" },
          body: { backgroundColor: "#F8F9FA" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📈 สรุปการเงินประจำเดือน",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center",
            },
            {
              type: "text",
              text: `${month}/${year}`,
              color: "#FFFFFF",
              size: "md",
              align: "center",
              margin: "xs",
            },
          ],
          paddingAll: "15px",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "15px",
          contents: [
            // รายรับรายจ่าย
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💰 รายรับรวม",
                  weight: "bold",
                  color: "#4CAF50",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${income.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#4CAF50",
                  align: "end",
                },
              ],
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💸 รายจ่ายรวม",
                  weight: "bold",
                  color: "#F44336",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${expense.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#F44336",
                  align: "end",
                },
              ],
            },
            {
              type: "separator",
              margin: "md",
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💳 ยอดสุทธิ",
                  weight: "bold",
                  color: "#333333",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${
                    balance >= 0 ? "+" : ""
                  }${balance.toLocaleString()} บาท`,
                  weight: "bold",
                  color: balance >= 0 ? "#4CAF50" : "#F44336",
                  align: "end",
                },
              ],
            },
            {
              type: "separator",
              margin: "md",
            },
            // หมวดหมู่ที่ใช้จ่ายมากที่สุด
            {
              type: "text",
              text: "🏆 หมวดหมู่ที่ใช้จ่ายมากที่สุด",
              weight: "bold",
              color: "#333333",
              size: "sm",
              margin: "md",
            },
            ...categoryItems,
            {
              type: "separator",
              margin: "md",
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "📊 จำนวนรายการทั้งหมด",
                  color: "#666666",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${totalTransactions} รายการ`,
                  color: "#666666",
                  size: "sm",
                  align: "end",
                },
              ],
            },
          ],
        },
      },
    };
  }

  // ยอดคงเหลือและสถิติ
  static createBalanceReport(data) {
    const { currentBalance, monthlyAverage, savingsRate, topExpenseCategory } =
      data;

    return {
      type: "flex",
      altText: "รายงานยอดคงเหลือและสถิติ",
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#FF9800" },
          body: { backgroundColor: "#F8F9FA" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "💰 รายงานการเงินส่วนตัว",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center",
            },
            {
              type: "text",
              text: "ข้อมูล ณ วันที่ " + new Date().toLocaleDateString("th-TH"),
              color: "#FFFFFF",
              size: "sm",
              align: "center",
              margin: "xs",
            },
          ],
          paddingAll: "15px",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "15px",
          contents: [
            // ยอดคงเหลือปัจจุบัน
            {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "ยอดคงเหลือปัจจุบัน",
                  color: "#666666",
                  size: "sm",
                  align: "center",
                },
                {
                  type: "text",
                  text: `${
                    currentBalance >= 0 ? "+" : ""
                  }${currentBalance.toLocaleString()} บาท`,
                  weight: "bold",
                  size: "xl",
                  color: currentBalance >= 0 ? "#4CAF50" : "#F44336",
                  align: "center",
                },
              ],
              backgroundColor: "#FFFFFF",
              cornerRadius: "10px",
              paddingAll: "15px",
            },
            {
              type: "separator",
              margin: "md",
            },
            // ค่าเฉลี่ยรายเดือน
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "📊 ค่าเฉลี่ยต่อเดือน",
                  weight: "bold",
                  color: "#333333",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${monthlyAverage.toLocaleString()} บาท`,
                  color: "#2196F3",
                  align: "end",
                },
              ],
            },
            // อัตราการออม
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "🎯 อัตราการออม",
                  weight: "bold",
                  color: "#333333",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${savingsRate}%`,
                  color:
                    savingsRate > 20
                      ? "#4CAF50"
                      : savingsRate > 10
                      ? "#FF9800"
                      : "#F44336",
                  align: "end",
                },
              ],
            },
            // หมวดหมู่ที่ใช้จ่ายมากที่สุด
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "🏆 หมวดที่ใช้จ่ายมากสุด",
                  weight: "bold",
                  color: "#333333",
                  flex: 1,
                },
                {
                  type: "text",
                  text: topExpenseCategory,
                  color: "#E91E63",
                  align: "end",
                },
              ],
            },
          ],
        },
      },
    };
  }

  // สรุปเดือนแบบง่าย
  static createSimpleMonthlySummary(data) {
    const { month, year, income, expense, balance } = data;
    
    return {
      type: "flex",
      altText: `สรุปเดือน ${month}/${year}`,
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#2196F3" },
          body: { backgroundColor: "#F8F9FA" }
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📅 สรุปเดือนนี้",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center"
            },
            {
              type: "text",
              text: `${month}/${year}`,
              color: "#FFFFFF",
              size: "md",
              align: "center",
              margin: "xs"
            }
          ],
          paddingAll: "15px"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "15px",
          contents: [
            // รายรับ
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💰 รวมรายรับ",
                  weight: "bold",
                  color: "#4CAF50",
                  flex: 1
                },
                {
                  type: "text",
                  text: `${income.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#4CAF50",
                  align: "end"
                }
              ]
            },
            // รายจ่าย
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💸 รวมรายจ่าย",
                  weight: "bold",
                  color: "#F44336",
                  flex: 1
                },
                {
                  type: "text",
                  text: `${expense.toLocaleString()} บาท`,
                  weight: "bold",
                  color: "#F44336",
                  align: "end"
                }
              ]
            },
            {
              type: "separator",
              margin: "md"
            },
            // คงเหลือ
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "💳 คงเหลือ",
                  weight: "bold",
                  color: "#333333",
                  flex: 1
                },
                {
                  type: "text",
                  text: `${balance >= 0 ? '+' : ''}${balance.toLocaleString()} บาท`,
                  weight: "bold",
                  color: balance >= 0 ? "#4CAF50" : "#F44336",
                  align: "end"
                }
              ]
            }
          ]
        }
      }
    };
  }

  // เมนูตัวเลือกรายงาน
  static createReportMenu() {
    return {
      type: "flex",
      altText: "เมนูรายงานการเงิน",
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#607D8B" },
          body: { backgroundColor: "#F8F9FA" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📊 รายงานการเงิน",
              weight: "bold",
              color: "#FFFFFF",
              size: "lg",
              align: "center",
            },
            {
              type: "text",
              text: "เลือกรายงานที่ต้องการดู",
              color: "#FFFFFF",
              size: "sm",
              align: "center",
              margin: "xs",
            },
          ],
          paddingAll: "15px",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "15px",
          contents: [
            {
              type: "button",
              action: {
                type: "message",
                label: "📅 สรุปวันนี้",
                text: "สรุปการเงินวันนี้",
              },
              style: "primary",
              color: "#4CAF50",
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "📋 รายการวันนี้",
                text: "รายการวันนี้",
              },
              style: "secondary",
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "📆 สรุปเดือนนี้",
                text: "สรุปเดือนนี้",
              },
              style: "primary",
              color: "#2196F3",
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "💰 ยอดคงเหลือ",
                text: "ยอดคงเหลือปัจจุบัน",
              },
              style: "primary",
              color: "#FF9800",
            },
          ],
        },
      },
    };
  }
}

module.exports = FlexMessageTemplates;
