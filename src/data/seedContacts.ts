import { Contact, HeatLevel, BirthdayReminder } from "@/data/contacts";

const names: { name: string; nickname?: string; region: string; background: string }[] = [
  { name: "陳建宏", nickname: "宏哥", region: "高雄市 左營區", background: "傳產業務主管，15年銷售經驗" },
  { name: "林美玲", nickname: "美玲姐", region: "台北市 大安區", background: "外商科技公司 HR 經理" },
  { name: "張志偉", nickname: "教練", region: "台中市 西屯區", background: "健身教練，自營工作室" },
  { name: "王淑芬", nickname: "王老師", region: "新北市 板橋區", background: "退休國中教師" },
  { name: "黃俊傑", nickname: "黃老闆", region: "台南市 東區", background: "連鎖早餐店老闆，3間分店" },
  { name: "李承翰", nickname: "小翰", region: "台北市 信義區", background: "金融業理專" },
  { name: "許雅婷", nickname: "婷婷", region: "桃園市 中壢區", background: "幼教老師" },
  { name: "吳明達", nickname: "達哥", region: "新竹市 東區", background: "科技公司工程師" },
  { name: "蔡佩君", nickname: "佩佩", region: "台中市 北屯區", background: "自由接案設計師" },
  { name: "鄭家豪", nickname: "阿豪", region: "高雄市 三民區", background: "汽車銷售顧問" },
  { name: "洪雅文", nickname: "雅文姐", region: "台南市 安平區", background: "瑜伽教室經營者" },
  { name: "劉冠廷", nickname: "廷廷", region: "新北市 永和區", background: "餐飲業店長" },
  { name: "楊淑惠", nickname: "惠姐", region: "台北市 中山區", background: "保險業務經理" },
  { name: "趙文彬", region: "嘉義市 西區", background: "中醫診所助理" },
  { name: "周怡萱", nickname: "萱萱", region: "新竹縣 竹北市", background: "全職媽媽" },
  { name: "謝宗翰", nickname: "翰哥", region: "台北市 松山區", background: "廣告公司總監" },
  { name: "馬麗華", nickname: "華姐", region: "台中市 南屯區", background: "美容院老闆" },
  { name: "方志明", region: "屏東縣 屏東市", background: "農會職員" },
  { name: "蘇怡安", nickname: "安安", region: "台北市 內湖區", background: "科技公司PM" },
  { name: "葉建成", nickname: "成哥", region: "彰化縣 員林市", background: "機車行老闆" },
  { name: "高淑珍", nickname: "珍姐", region: "台北市 大同區", background: "退休護理師" },
  { name: "彭威志", region: "基隆市 中正區", background: "港務局公務員" },
  { name: "盧心怡", nickname: "心怡", region: "新北市 三重區", background: "網拍賣家" },
  { name: "溫家銘", nickname: "銘哥", region: "台中市 豐原區", background: "房仲業務" },
  { name: "江雅琪", nickname: "琪琪", region: "台南市 中西區", background: "國小老師" },
  { name: "魏子軒", nickname: "軒軒", region: "桃園市 龜山區", background: "物流公司主管" },
  { name: "朱曉琳", nickname: "琳琳", region: "花蓮縣 花蓮市", background: "民宿老闆娘" },
  { name: "何政道", region: "雲林縣 斗六市", background: "藥局藥師" },
  { name: "田佳慧", nickname: "慧慧", region: "宜蘭縣 宜蘭市", background: "烘焙坊老闆" },
  { name: "沈俊宇", nickname: "阿宇", region: "台北市 萬華區", background: "水電行師傅" },
  { name: "范曉萍", nickname: "萍姐", region: "新北市 新莊區", background: "美髮沙龍經營者" },
  { name: "石家瑋", nickname: "小瑋", region: "台中市 大里區", background: "健身房教練" },
  { name: "呂雅芳", nickname: "芳姐", region: "高雄市 鳳山區", background: "社區發展協會理事" },
  { name: "鍾明軒", nickname: "軒哥", region: "新竹市 北區", background: "半導體設備工程師" },
  { name: "段秀蘭", nickname: "蘭姐", region: "台北市 北投區", background: "中醫推拿師" },
];

const heats: HeatLevel[] = ["cold", "warm", "hot", "loyal"];
const statuses = ["愛用者", "經營者", "高度興趣", "初步接觸", "觀望中", "鐵粉"];
const products = ["識霸", "水素水", "明利多", "喚活", "普利活", "AND", "晨星", "柔緹"];
const reminders: BirthdayReminder[] = ["none", "1month", "1week", "3days", "today"];
const contactMethods = [
  "LINE: user_", "電話: 09", "IG: @", "Email: ", "LINE: boss_",
];
const interactionTemplates = [
  "咖啡廳聊天，對產品表示興趣",
  "LINE 傳送產品資訊",
  "參加產品說明會",
  "朋友聚餐中介紹認識",
  "電話追蹤近況",
  "分享使用心得",
  "拜訪工作場所，現場展示產品",
  "社群媒體互動，回覆貼文",
  "約見面詳談經銷方案",
  "寄送試用品",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startDaysAgo: number, endDaysAgo: number): string {
  const now = Date.now();
  const start = now - startDaysAgo * 86400000;
  const end = now - endDaysAgo * 86400000;
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().split("T")[0];
}

function randomBirthday(): string {
  const year = 1965 + Math.floor(Math.random() * 35);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateSeedContacts(): Contact[] {
  const contacts: Contact[] = [];

  for (let i = 0; i < 35; i++) {
    const info = names[i];
    const heat = heats[Math.floor(Math.random() * heats.length)];
    const numStatuses = 1 + Math.floor(Math.random() * 2);
    const chosenStatuses: string[] = [];
    while (chosenStatuses.length < numStatuses) {
      const s = randomFrom(statuses);
      if (!chosenStatuses.includes(s)) chosenStatuses.push(s);
    }
    const numProducts = 1 + Math.floor(Math.random() * 3);
    const chosenProducts: string[] = [];
    while (chosenProducts.length < numProducts) {
      const p = randomFrom(products);
      if (!chosenProducts.includes(p)) chosenProducts.push(p);
    }

    const lastContact = randomDate(30, 0);
    const nextFollow = randomDate(-1, -20); // future dates

    const numInteractions = 1 + Math.floor(Math.random() * 3);
    const interactions = Array.from({ length: numInteractions }, (_, j) => ({
      date: randomDate(60, j * 10),
      summary: randomFrom(interactionTemplates),
    })).sort((a, b) => b.date.localeCompare(a.date));

    // Some contacts reference earlier ones
    let referrerId: string | undefined;
    let referrerName: string | undefined;
    if (i > 2 && Math.random() > 0.3) {
      const refIdx = Math.floor(Math.random() * i);
      referrerId = contacts[refIdx].id;
      referrerName = contacts[refIdx].name;
    }

    contacts.push({
      id: crypto.randomUUID(),
      name: info.name,
      nickname: info.nickname,
      region: info.region,
      background: info.background,
      statuses: chosenStatuses,
      heat,
      notes: `${info.background}，${heat === "hot" ? "非常積極" : heat === "loyal" ? "長期支持" : heat === "warm" ? "持續關注中" : "需要更多時間了解"}。`,
      lastContactDate: lastContact,
      nextFollowUpDate: nextFollow,
      interactions,
      productTags: chosenProducts,
      contactMethod: randomFrom(contactMethods) + info.name.substring(0, 2) + Math.floor(Math.random() * 900 + 100),
      birthday: randomBirthday(),
      birthdayReminder: randomFrom(reminders),
      referrerId,
      referrerName,
    });
  }

  return contacts;
}
