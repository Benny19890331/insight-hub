import type { HeatLevel } from "@/data/contacts";

export interface CardDiagnostics {
  name?: string;
  interest?: string;
  state?: string;
  type?: string;
  answers: string[];
  practice?: string;
  heatGuess: HeatLevel;
  needsAI: boolean;
}

function pick(raw: string, label: RegExp): string | undefined {
  const m = raw.match(label);
  return m ? m[1].trim() : undefined;
}

function inferHeat(state?: string): HeatLevel {
  if (!state) return "cold";
  if (/想突破|想賺|想改變|機會|衝|拼/.test(state)) return "hot";
  if (/觀望|想了解|考慮|評估/.test(state)) return "warm";
  if (/累|卡|迷惘|不確定|猶豫|疲/.test(state)) return "cold";
  return "cold";
}

export function parseCardDiagnostics(raw: string): CardDiagnostics {
  const text = raw.replace(/\r\n/g, "\n");

  const name = pick(text, /👤\s*受測者[:：]\s*(.+)/);
  const interest = pick(text, /🎯\s*興趣[:：]\s*(.+)/);
  const state = pick(text, /🧠\s*內在狀態[:：]\s*(.+)/);
  const type = pick(text, /🧬\s*類型[:：]\s*(.+)/);
  const practice =
    pick(text, /🫶\s*你的狀態[:：]\s*(.+)/) ||
    pick(text, /🌿[^\n]*\n+([^\n]+)/);

  // Capture all "→ ..." answers
  const answers: string[] = [];
  const answerRe = /→\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = answerRe.exec(text)) !== null) {
    answers.push(m[1].trim());
  }

  const heatGuess = inferHeat(state);
  const needsAI = !name || !type || answers.length < 5;

  return { name, interest, state, type, answers, practice, heatGuess, needsAI };
}

// 將第一/第二人稱（原診斷是寫給當事人看的）轉成第三人稱，方便顧問做筆記
function toThirdPerson(text: string, name?: string): string {
  const subject = name?.trim() || "對方";
  return text
    .replace(/你其實不是/g, `${subject}其實不是`)
    .replace(/你是在/g, `${subject}是在`)
    .replace(/你想要/g, `${subject}想要`)
    .replace(/你的/g, `${subject}的`)
    .replace(/你會/g, `${subject}會`)
    .replace(/你最/g, `${subject}最`)
    .replace(/你/g, subject)
    .replace(/我想/g, `${subject}想`)
    .replace(/我要/g, `${subject}要`)
    .replace(/我現在/g, `${subject}現在`)
    .replace(/我自己/g, `${subject}自己`)
    .replace(/我/g, subject);
}

export function buildNotesFromDiagnostics(
  d: CardDiagnostics,
  aiSummary?: string
): string {
  const lines: string[] = [];
  const header: string[] = [];
  if (d.type) header.push(`🧬 ${d.type}`);
  if (header.length) lines.push(header.join("｜"));
  if (d.state) lines.push(`🧠 狀態：${toThirdPerson(d.state, d.name)}`);
  if (aiSummary) {
    lines.push("");
    lines.push("【AI 人格摘要】");
    lines.push(toThirdPerson(aiSummary, d.name));
  }
  if (d.practice) {
    lines.push("");
    lines.push(`🌿 切入建議：${toThirdPerson(d.practice, d.name)}`);
  }
  return lines.join("\n");
}
