export interface Contact {
  id: string;
  name: string;
  region: string;
  background: string;
  status: string;
  heat: "cold" | "warm" | "hot" | "loyal";
  notes: string;
}

export const mockContacts: Contact[] = [
  {
    id: "1",
    name: "陳建宏",
    region: "高雄市 左營區",
    background: "傳產業務主管，15年銷售經驗",
    status: "觀望中",
    heat: "warm",
    notes: "對健康數據敏感，太太有在用保健品。週末較有空，偏好 LINE 聯繫。",
  },
  {
    id: "2",
    name: "林美玲",
    region: "台北市 大安區",
    background: "外商科技公司 HR 經理",
    status: "愛用者",
    heat: "loyal",
    notes: "已購買三次，主動分享給同事。可培養為潛在經銷夥伴。",
  },
  {
    id: "3",
    name: "張志偉",
    region: "台中市 西屯區",
    background: "健身教練，自營工作室",
    status: "高度興趣",
    heat: "hot",
    notes: "對蛋白質補充品系列很感興趣，想了解經銷方案。下週二可約見面。",
  },
  {
    id: "4",
    name: "王淑芬",
    region: "新北市 板橋區",
    background: "退休國中教師",
    status: "初步接觸",
    heat: "cold",
    notes: "女兒介紹認識，本人較保守。需要更多產品見證資料。",
  },
  {
    id: "5",
    name: "黃俊傑",
    region: "台南市 東區",
    background: "連鎖早餐店老闆，3間分店",
    status: "觀望中",
    heat: "warm",
    notes: "對被動收入概念有興趣，但擔心時間不夠。可先從消費者開始。",
  },
];
