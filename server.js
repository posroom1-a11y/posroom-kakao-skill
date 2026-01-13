const express = require("express");
const app = express();

app.use(express.json({ limit: "1mb" }));

const logs = new Map();

function pushLog(userId, role, text) {
  if (!logs.has(userId)) logs.set(userId, []);
  logs.get(userId).push({ role, text, ts: Date.now() });
  if (logs.get(userId).length > 40) {
    logs.get(userId).splice(0, logs.get(userId).length - 40);
  }
}

function makeSummary(items) {
  const text = items.map(x => x.text).join(" ");

  const nameMatch = text.match(/이름은?\s?([가-힣]{2,4})/);
  const phoneMatch = text.match(/010[-\s]?\d{3,4}[-\s]?\d{4}/);

  let payMethod = null;
  if (/카드/.test(text)) payMethod = "카드";
  if (/계좌|이체/.test(text)) payMethod = "계좌이체";
  if (/현금/.test(text)) payMethod = "현금";

  let payStatus = null;
  if (/결제\s?완료|입금\s?완료/.test(text)) payStatus = "완료";
  if (/미결제|결제\s?전/.test(text)) payStatus = "미결제";

  const hasAddress = /주소|사서함|수령지/.test(text);

  return [
    "📌 고객 핵심 정보 요약",
    "",
    `- 이름: ${nameMatch ? nameMatch[1] : "확인되지 않음"}`,
    `- 전화번호: ${phoneMatch ? phoneMatch[0] : "확인되지 않음"}`,
    `- 결제수단: ${payMethod || "확인되지 않음"}`,
    `- 결제여부: ${payStatus || "확인되지 않음"}`,
    `- 주소/사서함: ${hasAddress ? "언급됨" : "언급 없음"}`
  ].join("\n");
}

app.get("/", (req, res) => {
  res.send("OK");
});

app.post("/kakao/summary", (req, res) => {
  const userId = req.body?.userRequest?.user?.id || "unknown";
  const utterance = req.body?.userRequest?.utterance || "";

  if (utterance) pushLog(userId, "user", utterance);

  const items = logs.get(userId) || [];
  const summary = makeSummary(items);

  res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text: summary }
        }
      ]
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
