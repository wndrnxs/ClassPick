/**
 * 지문 서식 (클라이언트·서버 공용, DOM 의존성 없음)
 *
 * 지문은 줄바꿈이 있는 텍스트에 세 가지 태그만 허용한 형태로 저장합니다.
 *   <b>굵게</b>  <u>밑줄</u>  <box>네모 박스</box>
 * - 태그가 없는 기존 지문도 그대로 유효합니다.
 * - 정확히 이 6개 표기만 태그로 봅니다. 국어 지문에 흔한 「<보기>」, 「<가>」 같은 표기는 그대로 글자입니다.
 */

export type RichRun = { text: string; b?: boolean; u?: boolean; box?: boolean };
type Mark = "b" | "u" | "box";

const TAG_RE = /<(\/?)(b|u|box)>/g;
const MARKS: Mark[] = ["box", "b", "u"]; // 바깥 → 안쪽 순서 (직렬화 시 고정)

/** 서식 표기 → 구간 목록. 짝이 맞지 않는 닫는 태그는 무시하고, 닫히지 않은 태그는 끝까지 적용합니다. */
export function parseRich(markup: string): RichRun[] {
  const runs: RichRun[] = [];
  const depth: Record<Mark, number> = { b: 0, u: 0, box: 0 };
  let last = 0;
  const push = (text: string) => {
    if (!text) return;
    const run: RichRun = { text };
    if (depth.b) run.b = true;
    if (depth.u) run.u = true;
    if (depth.box) run.box = true;
    const prev = runs[runs.length - 1];
    if (prev && sameMarks(prev, run)) prev.text += text;
    else runs.push(run);
  };
  for (const m of markup.matchAll(TAG_RE)) {
    push(markup.slice(last, m.index));
    const mark = m[2] as Mark;
    depth[mark] = m[1] ? Math.max(0, depth[mark] - 1) : depth[mark] + 1;
    last = m.index + m[0].length;
  }
  push(markup.slice(last));
  return runs;
}

export const sameMarks = (a: Omit<RichRun, "text">, b: Omit<RichRun, "text">) =>
  Boolean(a.b) === Boolean(b.b) && Boolean(a.u) === Boolean(b.u) && Boolean(a.box) === Boolean(b.box);

/** 구간 목록 → 서식 표기 (인접한 같은 서식은 합치고, 태그 순서를 고정해 같은 내용은 같은 문자열이 되도록) */
export function runsToMarkup(runs: RichRun[]): string {
  const merged: RichRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && sameMarks(prev, r)) prev.text += r.text;
    else merged.push({ ...r });
  }
  return merged
    .map((r) => {
      const on = MARKS.filter((m) => r[m]);
      return on.map((m) => `<${m}>`).join("") + r.text + [...on].reverse().map((m) => `</${m}>`).join("");
    })
    .join("");
}

/** 태그를 뺀 순수 텍스트 (AI 결과 정리, 제목 추출, 글자 수 계산 등) */
export const stripRich = (markup: string) => markup.replace(TAG_RE, "");

export const hasRich = (markup: string) => /<\/?(?:b|u|box)>/.test(markup);

/** 서식 표기를 정돈합니다 (짝 맞추기·중복 제거). */
export const normalizeRich = (markup: string) => runsToMarkup(parseRich(markup));

/** 줄 단위로 나눈 구간 목록 (문서 내보내기용: 문단마다 한 줄) */
export function richLines(markup: string): RichRun[][] {
  const lines: RichRun[][] = [[]];
  for (const run of parseRich(markup.replace(/\r\n?/g, "\n"))) {
    run.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ ...run, text: part });
    });
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* 글자 단위 편집 (편집기의 서식 단추·붙여넣기·되돌리기에서 사용)              */
/* ------------------------------------------------------------------ */

export const MARK_BIT: Record<Mark, number> = { b: 1, u: 2, box: 4 };
export type RichMark = Mark;

/** 글자(UTF-16 단위)마다 서식 비트를 붙인 평면 표현 */
type Flat = { text: string; marks: number[] };

function flatten(runs: RichRun[]): Flat {
  let text = "";
  const marks: number[] = [];
  for (const r of runs) {
    const bits = (r.b ? 1 : 0) | (r.u ? 2 : 0) | (r.box ? 4 : 0);
    text += r.text;
    for (let i = 0; i < r.text.length; i++) marks.push(bits);
  }
  return { text, marks };
}

function unflatten({ text, marks }: Flat): RichRun[] {
  const runs: RichRun[] = [];
  for (let i = 0; i < text.length; ) {
    let j = i + 1;
    while (j < text.length && marks[j] === marks[i]) j++;
    const run: RichRun = { text: text.slice(i, j) };
    if (marks[i] & 1) run.b = true;
    if (marks[i] & 2) run.u = true;
    if (marks[i] & 4) run.box = true;
    runs.push(run);
    i = j;
  }
  return runs;
}

const clampRange = (len: number, start: number, end: number) => {
  const s = Math.max(0, Math.min(len, Math.min(start, end)));
  return [s, Math.max(s, Math.min(len, Math.max(start, end)))] as const;
};

/** [start, end) 구간의 서식을 켜거나 끕니다. 구간 전체가 이미 그 서식이면 끄고, 아니면 켭니다. (줄바꿈 글자는 건드리지 않음) */
export function toggleMark(markup: string, start: number, end: number, mark: Mark): string {
  const flat = flatten(parseRich(markup));
  const [s, e] = clampRange(flat.text.length, start, end);
  const bit = MARK_BIT[mark];
  let all = true;
  let any = false;
  for (let i = s; i < e; i++) {
    if (flat.text[i] === "\n") continue;
    any = true;
    if (!(flat.marks[i] & bit)) all = false;
  }
  if (!any) return normalizeRich(markup);
  for (let i = s; i < e; i++) {
    if (flat.text[i] === "\n") continue;
    flat.marks[i] = all ? flat.marks[i] & ~bit : flat.marks[i] | bit;
  }
  return runsToMarkup(unflatten(flat));
}

/** [start, end) 구간의 서식이 모두 켜져 있는지 (서식 단추의 눌림 표시용) */
export function marksIn(markup: string, start: number, end: number): Record<Mark, boolean> {
  const flat = flatten(parseRich(markup));
  const [s, e] = clampRange(flat.text.length, start, end);
  // 선택 없이 커서만 있으면 바로 앞 글자의 서식
  const from = s === e ? Math.max(0, s - 1) : s;
  const to = s === e ? Math.min(flat.text.length, from + 1) : e;
  const result = { b: true, u: true, box: true };
  let seen = false;
  for (let i = from; i < to; i++) {
    if (flat.text[i] === "\n") continue;
    seen = true;
    for (const m of MARKS) if (!(flat.marks[i] & MARK_BIT[m])) result[m] = false;
  }
  return seen ? result : { b: false, u: false, box: false };
}

/** [start, end) 구간의 서식을 모두 지웁니다. */
export function clearMarks(markup: string, start: number, end: number): string {
  const flat = flatten(parseRich(markup));
  const [s, e] = clampRange(flat.text.length, start, end);
  for (let i = s; i < e; i++) flat.marks[i] = 0;
  return runsToMarkup(unflatten(flat));
}

/** [start, end) 구간을 서식 있는 글로 바꿉니다 (붙여넣기). */
export function spliceRich(markup: string, start: number, end: number, insert: RichRun[]): string {
  const flat = flatten(parseRich(markup));
  const [s, e] = clampRange(flat.text.length, start, end);
  const ins = flatten(insert);
  return runsToMarkup(
    unflatten({
      text: flat.text.slice(0, s) + ins.text + flat.text.slice(e),
      marks: [...flat.marks.slice(0, s), ...ins.marks, ...flat.marks.slice(e)],
    }),
  );
}

/**
 * 붙여넣은 HTML에서 뽑은 구간을 정돈합니다.
 * - 일반 공백(" ")은 HTML 규칙대로 이어진 것을 하나로 줄이고 줄 앞뒤에서 지웁니다.
 * - 줄 앞의 \u00A0(&nbsp;, 서식 유지 영역의 공백)은 들여쓰기로 보고 남긴 뒤 일반 공백으로 바꿉니다.
 * - 앞뒤 빈 줄과 폭 없는 공백을 지웁니다.
 */
export function cleanPastedRuns(runs: RichRun[]): RichRun[] {
  const flat = flatten(runs);
  const outText: string[] = [];
  const outMarks: number[] = [];
  let lineStart = 0;
  const endLine = () => {
    // 줄 끝 공백 제거
    while (outText.length > lineStart && /[ \u00A0]/.test(outText[outText.length - 1])) {
      outText.pop();
      outMarks.pop();
    }
  };
  for (let i = 0; i < flat.text.length; i++) {
    const ch = flat.text[i];
    if (ch === "\u200B" || ch === "\uFEFF" || ch === "\r") continue;
    if (ch === "\n") {
      endLine();
      outText.push("\n");
      outMarks.push(0);
      lineStart = outText.length;
      continue;
    }
    if (ch === " ") {
      const prev = outText[outText.length - 1];
      if (outText.length === lineStart || prev === " ") continue; // 줄 앞 · 연속 공백
    }
    outText.push(ch);
    outMarks.push(flat.marks[i]);
  }
  endLine();
  let text = outText.join("").replace(/\u00A0/g, " ");
  let marks = outMarks;
  const lead = text.length - text.replace(/^\n+/, "").length;
  text = text.slice(lead).replace(/\n+$/, "");
  marks = marks.slice(lead, lead + text.length);
  return unflatten({ text, marks });
}

/* ------------------------------------------------------------------ */
/* 옛한글                                                               */
/* ------------------------------------------------------------------ */

/** 유니코드 옛한글 자모(첫가끝)·방점이 들어 있는지 — 표시용 글꼴 안내 등에 사용 */
export const hasOldHangul = (text: string) => /[ᄀ-ᇿꥠ-꥿ힰ-퟿〮〯]/.test(text);

/**
 * 한컴 전용 옛한글 코드(한양 PUA)가 들어 있는지.
 * 예전 한글 문서에서 복사하면 옛한글이 사용자 정의 영역(PUA) 글자로 들어와 다른 프로그램·AI가 읽지 못합니다.
 */
export const hasHanyangPua = (text: string) => /[-]/.test(text);
