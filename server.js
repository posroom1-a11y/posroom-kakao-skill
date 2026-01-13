const express = require("express");
const app = express();

// 카카오 요청 JSON 파싱
app.use(express.json({ limit: "1mb" }));

// 사용자별 대화 로그 (메모리 저장)
const logs = new Map();

// 대화 저장 함수
function pushLog(userId, role, text) {
  if (!logs.has(userId)) logs.set(userId, []);
  logs.get(userId).push({ role, text, ts: Date.now() });

  // 로그 너무 길어지면 최근 40개만 유지
  if (logs.get(userId).length > 40) {
    logs.get(userId).splice(0, logs.get(userId).length - 40);
  }
}

// 🔹 핵심 정보 요약 함수
function makeSummary(items) {
  const text = items.map(x => x.text).join(" ");

  // 이름
  const nameMatch = text.match(/이름은?\s?([가-힣]{2,4})/);

  // 전화번호
  const phoneMatch = text.match(/010[-\s]?\d{3,4}[-\s]?\d{4}/);

  // 결제 수단
  let payMethod = null;
  if (/카드/.test(text)) payMethod = "카드";
  if (/계좌|이체/.test(text)) payMethod = "계좌이체";
  if (/현금/.test(text)) payMethod = "현금";

  // 결제 여부
  let payStatus = null;
  if (/결제\s?완료|입금\s?완료/.test(text)) payStatus = "완료";
  if (/미결제|결제\s?전/.test(text)) payStatus = "미결제";

  // 주소 / 사서함
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

// 헬스 체크
app.get("/", (req, res) => {
  res.send("OK");
});


// ===============================
// 1️⃣ 모든 일반 대화 저장용 스킬
// ===============================
app.post("/kakao/log", (req, res) => {
  const userId = req.body?.userRequest?.user?.id || "unknown";
  const utterance = req.body?.userRequest?.utterance || "";

  if (utterance) pushLog(userId, "user", utterance);

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: "확인했습니다." } }
      ]
    }
  });
});


// ===============================
// 2️⃣ 핵심내용 요약 스킬
// ===============================
app.post("/kakao/summary", (req, res) => {
  const userId = req.body?.userRequest?.user?.id || "unknown";
  const utterance = req.body?.userRequest?.utterance || "";

  // 요약 요청도 로그에 남김
  if (utterance) pushLog(userId, "user", utterance);

  const items = logs.get(userId) || [];
  const summary = makeSummary(items);

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: summary } }
      ]
    }
  });
});


// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
