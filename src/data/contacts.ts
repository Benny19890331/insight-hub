export type HeatLevel = "cold" | "warm" | "hot" | "loyal";

export type BirthdayReminder = "none" | "1month" | "1week" | "3days" | "today";

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

export const birthdayReminderOptions: { value: BirthdayReminder; label: string }[] = [
  { value: "none", label: "不提醒" },
  { value: "1month", label: "一個月前提醒" },
  { value: "1week", label: "一週前提醒" },
  { value: "3days", label: "三天前提醒" },
  { value: "today", label: "當天提醒" },
];

export const heatOptionsRaw: { value: HeatLevel; label: string }[] = [
  { value: "loyal", label: "💎 忠實" },
  { value: "hot", label: "🔥 熱" },
  { value: "warm", label: "🌤 溫" },
  { value: "cold", label: "🧊 冷" },
];

export interface Contact {
  id: string;
  name: string;
  nickname?: string;
  region: string;
  background: string;
  statuses: string[];
  heat: HeatLevel;
  notes: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  nextFollowUpNote?: string;
  nextFollowUpTime?: string;
  interactions: Interaction[];
  productTags: string[];
  contactMethod?: string;
  avatarUrl?: string;
  referrerId?: string;
  referrerName?: string;
  birthday?: string;
  birthdayReminder?: BirthdayReminder;
}

export const heatOptions: { value: HeatLevel | "all"; label: string }[] = [
  { value: "all", label: "全部熱度" },
  { value: "loyal", label: "💎 忠實" },
  { value: "hot", label: "🔥 熱" },
  { value: "warm", label: "🌤 溫" },
  { value: "cold", label: "🧊 冷" },
];

// Helper to get referrer chain up to 3 levels
export function getReferrerChain(contact: Contact, allContacts: Contact[], maxDepth = 3): Contact[] {
  const chain: Contact[] = [];
  let current = contact;
  for (let i = 0; i < maxDepth; i++) {
    if (!current.referrerId) break;
    const ref = allContacts.find((c) => c.id === current.referrerId);
    if (!ref || chain.some((c) => c.id === ref.id)) break;
    chain.push(ref);
    current = ref;
  }
  return chain;
}

export const mockContacts: Contact[] = [
  {
    id: "1", name: "陳建宏", nickname: "宏哥",
    region: "高雄市 左營區", background: "傳產業務主管，15年銷售經驗",
    statuses: ["觀望中"], heat: "warm",
    notes: "對健康數據敏感，太太有在用保健品。週末較有空，偏好 LINE 聯繫。",
    lastContactDate: "2026-03-01", nextFollowUpDate: "2026-03-15",
    contactMethod: "LINE: chenhk88", productTags: ["識霸"],
    referrerId: "5", referrerName: "黃俊傑",
    birthday: "1978-09-12", birthdayReminder: "1week",
    interactions: [
      { date: "2026-03-01", summary: "一起喝咖啡，聊到健康話題，對血壓管理有興趣" },
      { date: "2026-02-18", summary: "LINE 初次聯繫，寄送產品型錄 PDF" },
    ],
  },
  {
    id: "2", name: "林美玲", nickname: "美玲姐",
    region: "台北市 大安區", background: "外商科技公司 HR 經理",
    statuses: ["愛用者", "鐵粉"], heat: "loyal",
    notes: "已購買三次，主動分享給同事。可培養為潛在經銷夥伴。",
    lastContactDate: "2026-03-05", nextFollowUpDate: "2026-03-12",
    contactMethod: "Email: mei.lin@techcorp.com", productTags: ["水素水", "識霸"],
    birthday: "1990-04-22", birthdayReminder: "3days",
    interactions: [
      { date: "2026-03-05", summary: "第三次回購，主動詢問經銷方案細節" },
      { date: "2026-02-20", summary: "分享使用心得到公司群組，帶來兩位新客戶" },
    ],
  },
  {
    id: "3", name: "張志偉", nickname: "教練",
    region: "台中市 西屯區", background: "健身教練，自營工作室",
    statuses: ["高度興趣"], heat: "hot",
    notes: "對蛋白質補充品系列很感興趣，想了解經銷方案。下週二可約見面。",
    lastContactDate: "2026-03-06", nextFollowUpDate: "2026-03-11",
    contactMethod: "IG: @coach_zhiwei", productTags: ["喚活", "識霸"],
    referrerId: "2", referrerName: "林美玲",
    birthday: "1992-11-05", birthdayReminder: "1week",
    interactions: [
      { date: "2026-03-06", summary: "參觀工作室，現場試用產品，反應非常正面" },
      { date: "2026-02-25", summary: "IG 私訊初次接觸，對高蛋白系列感興趣" },
    ],
  },
  {
    id: "4", name: "王淑芬", nickname: "王老師",
    region: "新北市 板橋區", background: "退休國中教師",
    statuses: ["初步接觸"], heat: "cold",
    notes: "女兒介紹認識，本人較保守。需要更多產品見證資料。",
    lastContactDate: "2026-02-28", nextFollowUpDate: "2026-03-20",
    contactMethod: "電話: 0912-345-678", productTags: ["水素水"],
    birthday: "1965-07-30", birthdayReminder: "today",
    interactions: [
      { date: "2026-02-28", summary: "女兒陪同參加產品說明會，態度保留但有禮貌" },
    ],
  },
  {
    id: "5", name: "黃俊傑", nickname: "黃老闆",
    region: "台南市 東區", background: "連鎖早餐店老闆，3間分店",
    statuses: ["觀望中"], heat: "warm",
    notes: "對被動收入概念有興趣，但擔心時間不夠。可先從消費者開始。",
    lastContactDate: "2026-03-03", nextFollowUpDate: "2026-03-17",
    contactMethod: "LINE: boss_huang", productTags: ["明利多", "識霸"],
    referrerId: "2", referrerName: "林美玲",
    birthday: "1985-01-18", birthdayReminder: "1month",
    interactions: [
      { date: "2026-03-03", summary: "早餐店拜訪，聊到副業收入，表示願意再了解" },
    ],
  },
  // --- 30 additional test contacts with referrer chains ---
  {
    id: "6", name: "李承翰", nickname: "小翰",
    region: "台北市 信義區", background: "金融業理專",
    statuses: ["高度興趣", "觀望中"], heat: "hot",
    notes: "對投資型健康產品很感興趣",
    lastContactDate: "2026-03-04", nextFollowUpDate: "2026-03-14",
    contactMethod: "LINE: han_lee99", productTags: ["識霸", "AND"],
    referrerId: "3", referrerName: "張志偉",
    birthday: "1988-06-15", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-04", summary: "咖啡廳聊到健康投資概念" }],
  },
  {
    id: "7", name: "許雅婷", nickname: "婷婷",
    region: "桃園市 中壢區", background: "幼教老師",
    statuses: ["初步接觸"], heat: "cold",
    notes: "朋友介紹，還在了解階段",
    lastContactDate: "2026-02-25", nextFollowUpDate: "2026-03-18",
    contactMethod: "LINE: yating_hsu", productTags: ["水素水"],
    referrerId: "6", referrerName: "李承翰",
    birthday: "1993-02-28", birthdayReminder: "3days",
    interactions: [{ date: "2026-02-25", summary: "LINE 初次聯繫" }],
  },
  {
    id: "8", name: "吳明達", nickname: "達哥",
    region: "新竹市 東區", background: "科技公司工程師",
    statuses: ["觀望中"], heat: "warm",
    notes: "理性分析型，需要數據佐證",
    lastContactDate: "2026-03-02", nextFollowUpDate: "2026-03-16",
    contactMethod: "Email: ming.wu@tech.com", productTags: ["識霸", "喚活"],
    referrerId: "7", referrerName: "許雅婷",
    birthday: "1986-12-03",
    interactions: [{ date: "2026-03-02", summary: "分享產品成分分析報告" }],
  },
  {
    id: "9", name: "蔡佩君", nickname: "佩佩",
    region: "台中市 北屯區", background: "自由接案設計師",
    statuses: ["愛用者"], heat: "loyal",
    notes: "設計師美感很好，協助過產品拍照",
    lastContactDate: "2026-03-07", nextFollowUpDate: "2026-03-14",
    contactMethod: "IG: @peijun_design", productTags: ["柔緹", "晨星"],
    referrerId: "2", referrerName: "林美玲",
    birthday: "1991-08-19", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-07", summary: "協助拍攝產品形象照" }],
  },
  {
    id: "10", name: "鄭家豪", nickname: "阿豪",
    region: "高雄市 三民區", background: "汽車銷售顧問",
    statuses: ["高度興趣"], heat: "hot",
    notes: "業務能力強，適合發展為經營者",
    lastContactDate: "2026-03-05", nextFollowUpDate: "2026-03-12",
    contactMethod: "LINE: hao_zheng", productTags: ["識霸", "普利活"],
    referrerId: "1", referrerName: "陳建宏",
    birthday: "1984-03-22",
    interactions: [{ date: "2026-03-05", summary: "參加產品說明會，反應熱烈" }],
  },
  {
    id: "11", name: "洪雅文", nickname: "雅文姐",
    region: "台南市 安平區", background: "瑜伽教室經營者",
    statuses: ["經營者", "愛用者"], heat: "loyal",
    notes: "已開始發展下線，非常積極",
    lastContactDate: "2026-03-06", nextFollowUpDate: "2026-03-10",
    contactMethod: "LINE: yawen_yoga", productTags: ["喚活", "柔緹", "晨星"],
    referrerId: "5", referrerName: "黃俊傑",
    birthday: "1987-05-14", birthdayReminder: "3days",
    interactions: [{ date: "2026-03-06", summary: "討論團隊經營策略" }],
  },
  {
    id: "12", name: "劉冠廷", nickname: "廷廷",
    region: "新北市 永和區", background: "餐飲業店長",
    statuses: ["觀望中"], heat: "warm",
    notes: "對被動收入有興趣但時間有限",
    lastContactDate: "2026-03-01", nextFollowUpDate: "2026-03-15",
    contactMethod: "LINE: kuan_liu", productTags: ["明利多"],
    referrerId: "11", referrerName: "洪雅文",
    birthday: "1990-10-08",
    interactions: [{ date: "2026-03-01", summary: "在餐廳聊到副業話題" }],
  },
  {
    id: "13", name: "楊淑惠", nickname: "惠姐",
    region: "台北市 中山區", background: "保險業務經理",
    statuses: ["鐵粉", "經營者"], heat: "loyal",
    notes: "人脈廣，已介紹超過10位新客戶",
    lastContactDate: "2026-03-07", nextFollowUpDate: "2026-03-10",
    contactMethod: "電話: 0933-456-789", productTags: ["識霸", "水素水", "AND"],
    referrerId: "2", referrerName: "林美玲",
    birthday: "1980-11-25", birthdayReminder: "1month",
    interactions: [{ date: "2026-03-07", summary: "月度業績檢討會議" }],
  },
  {
    id: "14", name: "趙文彬",
    region: "嘉義市 西區", background: "中醫診所助理",
    statuses: ["初步接觸"], heat: "cold",
    notes: "對中西醫結合保健有興趣",
    lastContactDate: "2026-02-20", nextFollowUpDate: "2026-03-20",
    contactMethod: "LINE: wenbin_zhao", productTags: ["普利活"],
    referrerId: "13", referrerName: "楊淑惠",
    birthday: "1995-04-10",
    interactions: [{ date: "2026-02-20", summary: "診所同事介紹認識" }],
  },
  {
    id: "15", name: "周怡萱", nickname: "萱萱",
    region: "新竹縣 竹北市", background: "全職媽媽",
    statuses: ["愛用者"], heat: "warm",
    notes: "很關心家人健康，固定購買",
    lastContactDate: "2026-03-03", nextFollowUpDate: "2026-03-17",
    contactMethod: "LINE: yixuan_mom", productTags: ["水素水", "晨星"],
    referrerId: "14", referrerName: "趙文彬",
    birthday: "1989-07-06", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-03", summary: "詢問兒童適用產品" }],
  },
  {
    id: "16", name: "謝宗翰", nickname: "翰哥",
    region: "台北市 松山區", background: "廣告公司總監",
    statuses: ["高度興趣", "觀望中"], heat: "hot",
    notes: "行銷專業，可協助品牌推廣",
    lastContactDate: "2026-03-04", nextFollowUpDate: "2026-03-11",
    contactMethod: "Email: zongh@adagency.com", productTags: ["AND", "識霸"],
    referrerId: "13", referrerName: "楊淑惠",
    birthday: "1983-09-30",
    interactions: [{ date: "2026-03-04", summary: "討論品牌合作可能性" }],
  },
  {
    id: "17", name: "馬麗華", nickname: "華姐",
    region: "台中市 南屯區", background: "美容院老闆",
    statuses: ["經營者"], heat: "hot",
    notes: "已在美容院推廣產品，業績穩定成長",
    lastContactDate: "2026-03-06", nextFollowUpDate: "2026-03-13",
    contactMethod: "LINE: lihua_beauty", productTags: ["柔緹", "喚活", "晨星"],
    referrerId: "9", referrerName: "蔡佩君",
    birthday: "1975-12-18", birthdayReminder: "3days",
    interactions: [{ date: "2026-03-06", summary: "美容院銷售策略會議" }],
  },
  {
    id: "18", name: "方志明",
    region: "屏東縣 屏東市", background: "農會職員",
    statuses: ["初步接觸"], heat: "cold",
    notes: "對有機健康食品有好感",
    lastContactDate: "2026-02-22", nextFollowUpDate: "2026-03-22",
    contactMethod: "電話: 0955-123-456", productTags: ["水素水"],
    referrerId: "10", referrerName: "鄭家豪",
    birthday: "1982-02-14",
    interactions: [{ date: "2026-02-22", summary: "電話中簡單介紹產品理念" }],
  },
  {
    id: "19", name: "蘇怡安", nickname: "安安",
    region: "台北市 內湖區", background: "科技公司PM",
    statuses: ["觀望中"], heat: "warm",
    notes: "工作忙碌但很注重養生",
    lastContactDate: "2026-03-02", nextFollowUpDate: "2026-03-16",
    contactMethod: "LINE: yian_su", productTags: ["識霸", "明利多"],
    referrerId: "16", referrerName: "謝宗翰",
    birthday: "1991-01-20", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-02", summary: "午餐時間聊到工作壓力與養生" }],
  },
  {
    id: "20", name: "葉建成", nickname: "成哥",
    region: "彰化縣 員林市", background: "機車行老闆",
    statuses: ["觀望中"], heat: "warm",
    notes: "對創業加盟模式有研究",
    lastContactDate: "2026-02-28", nextFollowUpDate: "2026-03-14",
    contactMethod: "LINE: cheng_ye", productTags: ["明利多"],
    referrerId: "5", referrerName: "黃俊傑",
    birthday: "1979-06-08",
    interactions: [{ date: "2026-02-28", summary: "黃俊傑介紹認識，初次電話" }],
  },
  {
    id: "21", name: "高淑珍", nickname: "珍姐",
    region: "台北市 大同區", background: "退休護理師",
    statuses: ["愛用者", "鐵粉"], heat: "loyal",
    notes: "醫學背景，對產品成分理解深入",
    lastContactDate: "2026-03-07", nextFollowUpDate: "2026-03-14",
    contactMethod: "電話: 0922-789-012", productTags: ["識霸", "普利活", "水素水"],
    referrerId: "13", referrerName: "楊淑惠",
    birthday: "1968-03-08", birthdayReminder: "today",
    interactions: [{ date: "2026-03-07", summary: "分享護理觀點的產品見證文" }],
  },
  {
    id: "22", name: "彭威志",
    region: "基隆市 中正區", background: "港務局公務員",
    statuses: ["初步接觸"], heat: "cold",
    notes: "個性穩重保守，需要時間考慮",
    lastContactDate: "2026-02-18", nextFollowUpDate: "2026-03-25",
    contactMethod: "LINE: weizhi_p", productTags: ["水素水"],
    referrerId: "21", referrerName: "高淑珍",
    birthday: "1976-08-22",
    interactions: [{ date: "2026-02-18", summary: "經高淑珍介紹認識" }],
  },
  {
    id: "23", name: "盧心怡", nickname: "心怡",
    region: "新北市 三重區", background: "網拍賣家",
    statuses: ["高度興趣"], heat: "hot",
    notes: "電商經驗豐富，對線上銷售很有想法",
    lastContactDate: "2026-03-05", nextFollowUpDate: "2026-03-12",
    contactMethod: "IG: @xinyi_shop", productTags: ["柔緹", "晨星"],
    referrerId: "17", referrerName: "馬麗華",
    birthday: "1994-10-12", birthdayReminder: "3days",
    interactions: [{ date: "2026-03-05", summary: "討論線上銷售策略" }],
  },
  {
    id: "24", name: "溫家銘", nickname: "銘哥",
    region: "台中市 豐原區", background: "房仲業務",
    statuses: ["觀望中"], heat: "warm",
    notes: "人脈廣但比較忙",
    lastContactDate: "2026-03-01", nextFollowUpDate: "2026-03-15",
    contactMethod: "LINE: jiaming_w", productTags: ["識霸"],
    referrerId: "3", referrerName: "張志偉",
    birthday: "1987-04-28",
    interactions: [{ date: "2026-03-01", summary: "健身房認識，聊到保健品" }],
  },
  {
    id: "25", name: "江雅琪", nickname: "琪琪",
    region: "台南市 中西區", background: "國小老師",
    statuses: ["初步接觸"], heat: "cold",
    notes: "對兒童保健產品有興趣",
    lastContactDate: "2026-02-24", nextFollowUpDate: "2026-03-24",
    contactMethod: "LINE: yaqi_jiang", productTags: ["晨星"],
    referrerId: "11", referrerName: "洪雅文",
    birthday: "1990-09-15",
    interactions: [{ date: "2026-02-24", summary: "瑜伽課認識，初步聊天" }],
  },
  {
    id: "26", name: "魏子軒", nickname: "軒軒",
    region: "桃園市 龜山區", background: "物流公司主管",
    statuses: ["觀望中", "初步接觸"], heat: "warm",
    notes: "管理經驗豐富，對團隊經營有想法",
    lastContactDate: "2026-03-03", nextFollowUpDate: "2026-03-17",
    contactMethod: "Email: zixuan.wei@logistics.com", productTags: ["AND"],
    referrerId: "6", referrerName: "李承翰",
    birthday: "1981-11-02",
    interactions: [{ date: "2026-03-03", summary: "李承翰介紹，餐敘認識" }],
  },
  {
    id: "27", name: "朱曉琳", nickname: "琳琳",
    region: "花蓮縣 花蓮市", background: "民宿老闆娘",
    statuses: ["愛用者"], heat: "warm",
    notes: "在民宿提供產品給客人體驗",
    lastContactDate: "2026-03-04", nextFollowUpDate: "2026-03-18",
    contactMethod: "LINE: xiaolin_bb", productTags: ["水素水", "喚活"],
    referrerId: "9", referrerName: "蔡佩君",
    birthday: "1988-05-20", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-04", summary: "討論民宿合作方案" }],
  },
  {
    id: "28", name: "何政道",
    region: "雲林縣 斗六市", background: "藥局藥師",
    statuses: ["高度興趣"], heat: "hot",
    notes: "專業背景，對產品功效分析深入",
    lastContactDate: "2026-03-06", nextFollowUpDate: "2026-03-13",
    contactMethod: "電話: 0966-234-567", productTags: ["識霸", "普利活"],
    referrerId: "14", referrerName: "趙文彬",
    birthday: "1983-07-12",
    interactions: [{ date: "2026-03-06", summary: "討論產品成分與功效" }],
  },
  {
    id: "29", name: "段美華", nickname: "美華姐",
    region: "新北市 汐止區", background: "社區管委會主委",
    statuses: ["經營者"], heat: "hot",
    notes: "在社區推廣非常成功",
    lastContactDate: "2026-03-07", nextFollowUpDate: "2026-03-11",
    contactMethod: "LINE: meihua_d", productTags: ["水素水", "識霸", "明利多"],
    referrerId: "13", referrerName: "楊淑惠",
    birthday: "1972-01-30", birthdayReminder: "3days",
    interactions: [{ date: "2026-03-07", summary: "社區團購訂單處理" }],
  },
  {
    id: "30", name: "范植豪",
    region: "苗栗縣 頭份市", background: "工廠作業員",
    statuses: ["初步接觸"], heat: "cold",
    notes: "收入穩定但不高，對價格敏感",
    lastContactDate: "2026-02-15", nextFollowUpDate: "2026-03-20",
    contactMethod: "LINE: zhihao_fan", productTags: ["水素水"],
    referrerId: "20", referrerName: "葉建成",
    birthday: "1992-03-18",
    interactions: [{ date: "2026-02-15", summary: "葉建成帶來認識" }],
  },
  {
    id: "31", name: "尤佳慧", nickname: "慧慧",
    region: "宜蘭縣 宜蘭市", background: "旅行社業務",
    statuses: ["觀望中"], heat: "warm",
    notes: "常出差，時間不固定",
    lastContactDate: "2026-03-02", nextFollowUpDate: "2026-03-16",
    contactMethod: "LINE: jiahui_you", productTags: ["喚活"],
    referrerId: "27", referrerName: "朱曉琳",
    birthday: "1989-12-05",
    interactions: [{ date: "2026-03-02", summary: "花蓮民宿認識" }],
  },
  {
    id: "32", name: "邱振宇", nickname: "阿宇",
    region: "台北市 南港區", background: "軟體工程師",
    statuses: ["高度興趣"], heat: "hot",
    notes: "對數據驅動的健康管理很有興趣",
    lastContactDate: "2026-03-05", nextFollowUpDate: "2026-03-12",
    contactMethod: "Email: zhenyu.q@dev.com", productTags: ["識霸", "AND"],
    referrerId: "8", referrerName: "吳明達",
    birthday: "1993-08-25", birthdayReminder: "1week",
    interactions: [{ date: "2026-03-05", summary: "討論健康數據追蹤" }],
  },
  {
    id: "33", name: "呂素蘭", nickname: "蘭姐",
    region: "台中市 大里區", background: "市場攤商",
    statuses: ["愛用者"], heat: "warm",
    notes: "口碑行銷能力很強",
    lastContactDate: "2026-03-04", nextFollowUpDate: "2026-03-18",
    contactMethod: "電話: 0912-567-890", productTags: ["水素水", "明利多"],
    referrerId: "17", referrerName: "馬麗華",
    birthday: "1970-04-02",
    interactions: [{ date: "2026-03-04", summary: "在市場推薦給鄰攤" }],
  },
  {
    id: "34", name: "潘柏翰",
    region: "新北市 中和區", background: "保全公司組長",
    statuses: ["初步接觸"], heat: "cold",
    notes: "工作時間不固定，假日才有空",
    lastContactDate: "2026-02-20", nextFollowUpDate: "2026-03-22",
    contactMethod: "LINE: bohan_pan", productTags: ["普利活"],
    referrerId: "29", referrerName: "段美華",
    birthday: "1986-06-30",
    interactions: [{ date: "2026-02-20", summary: "社區活動認識" }],
  },
  {
    id: "35", name: "傅心瑜", nickname: "小瑜",
    region: "高雄市 鼓山區", background: "咖啡廳店員",
    statuses: ["觀望中"], heat: "warm",
    notes: "年輕有活力，適合社群推廣",
    lastContactDate: "2026-03-01", nextFollowUpDate: "2026-03-15",
    contactMethod: "IG: @xinyu_coffee", productTags: ["晨星", "柔緹"],
    referrerId: "10", referrerName: "鄭家豪",
    birthday: "1997-11-22", birthdayReminder: "3days",
    interactions: [{ date: "2026-03-01", summary: "咖啡廳聊天認識" }],
  },
];
