export type HeatLevel = "cold" | "warm" | "hot" | "loyal";

export interface Interaction {
  date: string;
  summary: string;
}

export const productOptions = [
  "識霸", "水素水", "明利多", "喚活", "普利活", "AND", "晨星", "柔緹",
];

export const statusOptions = [
  "愛用者", "經營者", "高度興趣", "初步接觸", "觀望中", "鐵粉",
];

export interface Contact {
  id: string;
  name: string;
  region: string;
  background: string;
  status: string;
  heat: HeatLevel;
  notes: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  interactions: Interaction[];
  productTags: string[];
  contactMethod?: string;
  avatarUrl?: string;
  referrerId?: string;
  referrerName?: string;
  birthday?: string;
}

export const heatOptions: { value: HeatLevel | "all"; label: string }[] = [
  { value: "all", label: "全部熱度" },
  { value: "hot", label: "🔥 熱" },
  { value: "warm", label: "🌤 溫" },
  { value: "cold", label: "🧊 冷" },
  { value: "loyal", label: "💎 忠實" },
];

export const mockContacts: Contact[] = [
  {
    id: "1",
    name: "陳建宏",
    region: "高雄市 左營區",
    background: "傳產業務主管，15年銷售經驗",
    status: "觀望中",
    heat: "warm",
    notes: "對健康數據敏感，太太有在用保健品。週末較有空，偏好 LINE 聯繫。",
    lastContactDate: "2026-03-01",
    nextFollowUpDate: "2026-03-15",
    contactMethod: "LINE: chenhk88",
    productTags: ["識霸"],
    referrerId: "5",
    referrerName: "黃俊傑",
    birthday: "1978-09-12",
    interactions: [
      { date: "2026-03-01", summary: "一起喝咖啡，聊到健康話題，對血壓管理有興趣" },
      { date: "2026-02-18", summary: "LINE 初次聯繫，寄送產品型錄 PDF" },
    ],
  },
  {
    id: "2",
    name: "林美玲",
    region: "台北市 大安區",
    background: "外商科技公司 HR 經理",
    status: "愛用者",
    heat: "loyal",
    notes: "已購買三次，主動分享給同事。可培養為潛在經銷夥伴。",
    lastContactDate: "2026-03-05",
    nextFollowUpDate: "2026-03-12",
    contactMethod: "Email: mei.lin@techcorp.com",
    productTags: ["水素水", "識霸"],
    birthday: "1990-04-22",
    interactions: [
      { date: "2026-03-05", summary: "第三次回購，主動詢問經銷方案細節" },
      { date: "2026-02-20", summary: "分享使用心得到公司群組，帶來兩位新客戶" },
    ],
  },
  {
    id: "3",
    name: "張志偉",
    region: "台中市 西屯區",
    background: "健身教練，自營工作室",
    status: "高度興趣",
    heat: "hot",
    notes: "對蛋白質補充品系列很感興趣，想了解經銷方案。下週二可約見面。",
    lastContactDate: "2026-03-06",
    nextFollowUpDate: "2026-03-11",
    contactMethod: "IG: @coach_zhiwei",
    productTags: ["喚活", "識霸"],
    referrerId: "2",
    referrerName: "林美玲",
    birthday: "1992-11-05",
    interactions: [
      { date: "2026-03-06", summary: "參觀工作室，現場試用產品，反應非常正面" },
      { date: "2026-02-25", summary: "IG 私訊初次接觸，對高蛋白系列感興趣" },
    ],
  },
  {
    id: "4",
    name: "王淑芬",
    region: "新北市 板橋區",
    background: "退休國中教師",
    status: "初步接觸",
    heat: "cold",
    notes: "女兒介紹認識，本人較保守。需要更多產品見證資料。",
    lastContactDate: "2026-02-28",
    nextFollowUpDate: "2026-03-20",
    contactMethod: "電話: 0912-345-678",
    productTags: ["水素水"],
    birthday: "1965-07-30",
    interactions: [
      { date: "2026-02-28", summary: "女兒陪同參加產品說明會，態度保留但有禮貌" },
      { date: "2026-02-15", summary: "透過女兒取得聯繫方式，電話簡短問候" },
    ],
  },
  {
    id: "5",
    name: "黃俊傑",
    region: "台南市 東區",
    background: "連鎖早餐店老闆，3間分店",
    status: "觀望中",
    heat: "warm",
    notes: "對被動收入概念有興趣，但擔心時間不夠。可先從消費者開始。",
    lastContactDate: "2026-03-03",
    nextFollowUpDate: "2026-03-17",
    contactMethod: "LINE: boss_huang",
    productTags: ["明利多", "識霸"],
    referrerId: "2",
    referrerName: "林美玲",
    birthday: "1985-01-18",
    interactions: [
      { date: "2026-03-03", summary: "早餐店拜訪，聊到副業收入，表示願意再了解" },
      { date: "2026-02-22", summary: "朋友介紹認識，電話中初步介紹商業模式" },
    ],
  },
];
