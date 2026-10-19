/**
 * 지문 상자 안의 문단 배치 (수능 문제지 형식) — 화면·인쇄·HWPX·DOCX 공용
 *
 * - 산문(소설·수필·독서): 줄 하나가 한 문단, 첫 줄 들여쓰기, 문단 사이 빈 줄 없음
 * - 운문(시·시조·가사 등): 행을 그대로, 연 사이 빈 줄 유지
 */
import { richLines, stripRich, type RichRun } from "./rich-text";

export type PassageKind = "verse" | "prose";

const VERSE_HINT = /시조|가사|향가|민요|고려\s*가요|속요|악장|한시|(^|[^가-힣])시([^가-힣]|$)|현대시|고전시가|자유시|서정시/;
const PROSE_HINT = /소설|수필|독서|비문학|설명문|논설|인문|사회|과학|기술|예술|극|희곡|시나리오|비평|기행/;

/** 갈래 정보(있으면)와 줄 길이로 운문·산문을 가립니다. */
export function passageKind(markup: string, genreHint = ""): PassageKind {
  if (VERSE_HINT.test(genreHint)) return "verse";
  if (PROSE_HINT.test(genreHint)) return "prose";
  const lines = stripRich(markup)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "prose";
  const avg = lines.reduce((n, l) => n + l.length, 0) / lines.length;
  return avg >= 28 ? "prose" : "verse";
}

export type PassageLine = { runs: RichRun[]; indent: boolean } | { gap: true };

/** 지문 상자에 넣을 줄 목록 (서식 구간 포함) */
export function passageLayout(markup: string, kind: PassageKind): PassageLine[] {
  const lines = richLines(markup);
  // 앞뒤 빈 줄 정리
  while (lines.length && lines[0].length === 0) lines.shift();
  while (lines.length && lines[lines.length - 1].length === 0) lines.pop();
  if (kind === "prose") {
    return lines.filter((runs) => runs.some((r) => r.text.trim())).map((runs) => ({ runs: trimStart(runs), indent: true }));
  }
  const out: PassageLine[] = [];
  for (const runs of lines) {
    if (runs.every((r) => !r.text.trim())) {
      if (out.length && !("gap" in out[out.length - 1])) out.push({ gap: true });
    } else out.push({ runs, indent: false });
  }
  return out;
}

/** 산문 문단 앞의 공백(직접 넣은 들여쓰기)은 지우고 들여쓰기 서식으로 대신합니다. */
function trimStart(runs: RichRun[]): RichRun[] {
  const out = runs.map((r) => ({ ...r }));
  while (out.length && !out[0].text.trimStart()) out.shift();
  if (out.length) out[0].text = out[0].text.replace(/^[\s　]+/, "");
  return out;
}
