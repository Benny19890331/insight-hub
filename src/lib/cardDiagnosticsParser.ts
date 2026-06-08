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

export function buildNotesFromDiagnostics(
  d: CardDiagnostics,
  aiSummary?: string
): string {
  const lines: string[] = [];
  const header: string[] = [];
  if (d.type) header.push(`🧬 ${d.type}`);
  if (d.interest) header.push(`🎯 ${d.interest}`);
  if (header.length) lines.push(header.join("｜"));
  if (d.state) lines.push(`🧠 狀態：${d.state}`);
  if (aiSummary) {
    lines.push("");
    lines.push("【AI 人格摘要】");
    lines.push(aiSummary);
  }
  if (d.practice) {
    lines.push("");
    lines.push(`🌿 切入建議：${d.practice}`);
  }
  return lines.join("\n");
}
